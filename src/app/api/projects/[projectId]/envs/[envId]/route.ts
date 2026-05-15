import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { decryptBlob, encryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { logAuditEvent, createEnvVersion } from "@/lib/audit";

const MAX_ENV_BYTES = 512_000;

const PatchBody = z.object({
  label: z.string().min(1).max(80).optional(),
  content: z.string().max(MAX_ENV_BYTES).optional(),
});

type Ctx = { params: Promise<{ projectId: string; envId: string }> };

function getClientInfo(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId, envId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "viewer")) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  const rows = await db
    .select()
    .from(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return jsonError("NOT_FOUND", "Env not found.", 404);
  }

  try {
    const content = decryptBlob(row.iv, row.ciphertext);

    // Log view event (async, don't wait)
    const clientInfo = getClientInfo(request);
    logAuditEvent({
      userId: session.user.id,
      action: "env_view",
      resourceType: "env",
      resourceId: envId,
      metadata: { projectId, label: row.label },
      ...clientInfo,
    }).catch(console.error);

    return jsonSuccess({
      id: row.id,
      label: row.label,
      content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (e) {
    console.error(e);
    return jsonError("DECRYPT_FAILED", "Could not decrypt stored env.", 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId, envId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "editor")) {
    return jsonError(
      "FORBIDDEN",
      "You need editor access to change env files.",
      403,
    );
  }

  const rows = await db
    .select()
    .from(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return jsonError("NOT_FOUND", "Env not found.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const now = new Date();
  let nextLabel = row.label;
  let nextIv = row.iv;
  let nextCipher = row.ciphertext;
  const clientInfo = getClientInfo(request);

  try {
    if (parsed.data.content !== undefined) {
      const enc = encryptBlob(parsed.data.content);
      nextIv = enc.iv;
      nextCipher = enc.ciphertext;
    }
    if (parsed.data.label !== undefined) {
      nextLabel = parsed.data.label.trim();
    }

    if (nextLabel !== row.label) {
      const dup = await db
        .select({ id: projectEnv.id })
        .from(projectEnv)
        .where(
          and(
            eq(projectEnv.projectId, projectId),
            eq(projectEnv.label, nextLabel),
          ),
        )
        .limit(1);
      const dupRow = dup[0];
      if (dupRow && dupRow.id !== envId) {
        return jsonError(
          "DUPLICATE_LABEL",
          "That label is already used in this project.",
          409,
        );
      }
    }

    // Create version before updating
    await createEnvVersion({
      projectEnvId: envId,
      projectId,
      label: row.label,
      iv: row.iv,
      ciphertext: row.ciphertext,
      changeType: "updated",
      changedByUserId: session.user.id,
      comment:
        parsed.data.label !== row.label
          ? `Renamed from "${row.label}" to "${nextLabel}"`
          : undefined,
    });

    await db
      .update(projectEnv)
      .set({
        label: nextLabel,
        iv: nextIv,
        ciphertext: nextCipher,
        updatedAt: now,
      })
      .where(eq(projectEnv.id, envId));

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: "env_update",
      resourceType: "env",
      resourceId: envId,
      metadata: {
        projectId,
        oldLabel: row.label,
        newLabel: nextLabel,
        contentChanged: parsed.data.content !== undefined,
      },
      ...clientInfo,
    });

    return jsonSuccess({
      id: row.id,
      label: nextLabel,
      createdAt: row.createdAt,
      updatedAt: now,
    });
  } catch (e) {
    console.error(e);
    return jsonError("INTERNAL_ERROR", "Could not update env.", 500);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId, envId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "editor")) {
    return jsonError(
      "FORBIDDEN",
      "You need editor access to delete env files.",
      403,
    );
  }

  // Get the env before deleting for version history
  const rows = await db
    .select()
    .from(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return jsonError("NOT_FOUND", "Env not found.", 404);
  }

  const clientInfo = getClientInfo(request);

  // Create version before deleting
  await createEnvVersion({
    projectEnvId: envId,
    projectId,
    label: row.label,
    iv: row.iv,
    ciphertext: row.ciphertext,
    changeType: "deleted",
    changedByUserId: session.user.id,
  });

  const deleted = await db
    .delete(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .returning({ id: projectEnv.id });

  // Log audit event
  await logAuditEvent({
    userId: session.user.id,
    action: "env_delete",
    resourceType: "env",
    resourceId: envId,
    metadata: { projectId, label: row.label },
    ...clientInfo,
  });

  if (deleted.length === 0) {
    return jsonError("NOT_FOUND", "Env not found.", 404);
  }
  return new Response(null, { status: 204 });
}
