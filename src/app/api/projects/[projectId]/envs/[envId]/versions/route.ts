import { and, eq } from "drizzle-orm";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { decryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv, projectEnvVersion } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { logAuditEvent, createEnvVersion } from "@/lib/audit";
import { listEnvVersionsWithUser } from "@/lib/db/read-queries";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string; envId: string }> };

const RollbackBody = z.object({
  versionId: z.string(),
  comment: z.string().optional(),
});

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

  // Verify env exists and belongs to project
  const envRows = await db
    .select({ id: projectEnv.id, label: projectEnv.label })
    .from(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .limit(1);

  if (envRows.length === 0) {
    return jsonError("NOT_FOUND", "Environment not found.", 404);
  }

  const versions = await listEnvVersionsWithUser(envId, 50);
  return jsonSuccess(versions);
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId, envId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "editor")) {
    return jsonError(
      "FORBIDDEN",
      "You need editor access to rollback env files.",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }
  const parsed = RollbackBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  // Get current env
  const envRows = await db
    .select()
    .from(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .limit(1);

  if (envRows.length === 0) {
    return jsonError("NOT_FOUND", "Environment not found.", 404);
  }

  const currentEnv = envRows[0]!;

  // Get version to rollback to
  const versionRows = await db
    .select()
    .from(projectEnvVersion)
    .where(
      and(
        eq(projectEnvVersion.id, parsed.data.versionId),
        eq(projectEnvVersion.projectEnvId, envId),
      ),
    )
    .limit(1);

  if (versionRows.length === 0) {
    return jsonError("NOT_FOUND", "Version not found.", 404);
  }

  const version = versionRows[0]!;

  // Verify we can decrypt the version
  try {
    decryptBlob(version.iv, version.ciphertext);
  } catch {
    return jsonError("DECRYPT_FAILED", "Could not decrypt version.", 500);
  }

  const now = new Date();
  const clientInfo = {
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };

  // Create version of current state before rollback
  await createEnvVersion({
    projectEnvId: envId,
    projectId,
    label: currentEnv.label,
    iv: currentEnv.iv,
    ciphertext: currentEnv.ciphertext,
    changeType: "updated",
    changedByUserId: session.user.id,
    comment: `Pre-rollback to version ${version.version}`,
  });

  // Apply rollback
  await db
    .update(projectEnv)
    .set({
      iv: version.iv,
      ciphertext: version.ciphertext,
      updatedAt: now,
    })
    .where(eq(projectEnv.id, envId));

  // Log audit event
  await logAuditEvent({
    userId: session.user.id,
    action: "env_version_rollback",
    resourceType: "env",
    resourceId: envId,
    metadata: {
      projectId,
      label: currentEnv.label,
      rolledBackToVersion: version.version,
      rolledBackToVersionId: version.id,
      comment: parsed.data.comment,
    },
    ...clientInfo,
  });

  return jsonSuccess({
    id: envId,
    label: currentEnv.label,
    rolledBackToVersion: version.version,
    updatedAt: now,
  });
}
