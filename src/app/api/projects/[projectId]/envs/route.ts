import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { encryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { logAuditEvent, createEnvVersion } from "@/lib/audit";

const MAX_ENV_BYTES = 512_000;

const CreateEnvBody = z.object({
  label: z.string().min(1).max(80),
  content: z.string().max(MAX_ENV_BYTES),
});

type Ctx = { params: Promise<{ projectId: string }> };

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
  const { projectId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "viewer")) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  const rows = await db
    .select({
      id: projectEnv.id,
      label: projectEnv.label,
      createdAt: projectEnv.createdAt,
      updatedAt: projectEnv.updatedAt,
    })
    .from(projectEnv)
    .where(eq(projectEnv.projectId, projectId));

  return jsonSuccess(rows);
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "editor")) {
    return jsonError(
      "FORBIDDEN",
      "You need editor access to upload or change env files.",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }
  const parsed = CreateEnvBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const clientInfo = getClientInfo(request);

  try {
    const { iv, ciphertext } = encryptBlob(parsed.data.content);
    const now = new Date();
    const label = parsed.data.label.trim();

    const dup = await db
      .select({
        id: projectEnv.id,
        createdAt: projectEnv.createdAt,
        iv: projectEnv.iv,
        ciphertext: projectEnv.ciphertext,
      })
      .from(projectEnv)
      .where(
        and(eq(projectEnv.projectId, projectId), eq(projectEnv.label, label)),
      )
      .limit(1);

    if (dup.length > 0) {
      const existing = dup[0]!;

      // Create version before updating
      await createEnvVersion({
        projectEnvId: existing.id,
        projectId,
        label,
        iv: existing.iv,
        ciphertext: existing.ciphertext,
        changeType: "updated",
        changedByUserId: session.user.id,
      });

      await db
        .update(projectEnv)
        .set({
          iv,
          ciphertext,
          updatedAt: now,
        })
        .where(eq(projectEnv.id, existing.id));

      // Log audit event
      await logAuditEvent({
        userId: session.user.id,
        action: "env_update",
        resourceType: "env",
        resourceId: existing.id,
        metadata: { projectId, label, via: "api" },
        ...clientInfo,
      });

      return jsonSuccess(
        {
          id: existing.id,
          label,
          createdAt: existing.createdAt,
          updatedAt: now,
        },
        { status: 200 },
      );
    }

    const id = nanoid();
    await db.insert(projectEnv).values({
      id,
      projectId,
      label,
      iv,
      ciphertext,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial version
    await createEnvVersion({
      projectEnvId: id,
      projectId,
      label,
      iv,
      ciphertext,
      changeType: "created",
      changedByUserId: session.user.id,
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: "env_create",
      resourceType: "env",
      resourceId: id,
      metadata: { projectId, label },
      ...clientInfo,
    });

    return jsonSuccess(
      { id, label, createdAt: now, updatedAt: now },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption failed";
    if (msg.includes("STORAGE_ENCRYPTION_KEY")) {
      return jsonError(
        "SERVICE_MISCONFIGURED",
        "Server encryption key is not configured.",
        503,
      );
    }
    console.error(e);
    return jsonError("INTERNAL_ERROR", "Could not save env file.", 500);
  }
}
