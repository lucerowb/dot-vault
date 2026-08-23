import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { decryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv } from "@/lib/db";
import {
  countEnvDiffChanges,
  diffEnvContents,
  maskEnvValue,
} from "@/lib/env-diff";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { logAuditEvent } from "@/lib/audit";

const DiffQuery = z
  .object({
    from: z.string().min(1).max(80),
    to: z.string().min(1).max(80),
  })
  .refine((q) => q.from !== q.to, {
    message: "from and to must be different labels",
  });

type Ctx = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/:projectId/envs/diff?from=<label>&to=<label>
 * Key-level comparison of two stored env files. Values are returned
 * masked — this endpoint never exposes full plaintext.
 */
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

  const url = new URL(request.url);
  const parsedQuery = DiffQuery.safeParse({
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
  });
  if (!parsedQuery.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsedQuery.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }
  const { from, to } = parsedQuery.data;

  const rows = await db
    .select({
      id: projectEnv.id,
      label: projectEnv.label,
      iv: projectEnv.iv,
      ciphertext: projectEnv.ciphertext,
      updatedAt: projectEnv.updatedAt,
    })
    .from(projectEnv)
    .where(
      and(
        eq(projectEnv.projectId, projectId),
        inArray(projectEnv.label, [from, to]),
      ),
    );

  const byLabel = new Map(rows.map((r) => [r.label, r]));
  const fromRow = byLabel.get(from);
  const toRow = byLabel.get(to);

  if (!fromRow || !toRow) {
    const missing = !fromRow ? from : to;
    return jsonError(
      "NOT_FOUND",
      `Env "${missing}" not found in this project.`,
      404,
    );
  }

  let fromContent: string;
  let toContent: string;
  try {
    fromContent = decryptBlob(fromRow.iv, fromRow.ciphertext);
    toContent = decryptBlob(toRow.iv, toRow.ciphertext);
  } catch (e) {
    console.error(e);
    return jsonError("DECRYPT_FAILED", "Could not decrypt stored env.", 500);
  }

  const raw = diffEnvContents(fromContent, toContent);

  logAuditEvent({
    userId: session.user.id,
    action: "env_view",
    resourceType: "env",
    resourceId: toRow.id,
    metadata: { projectId, kind: "diff", from, to },
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  }).catch(console.error);

  return jsonSuccess({
    from: { label: from, updatedAt: fromRow.updatedAt },
    to: { label: to, updatedAt: toRow.updatedAt },
    added: raw.added.map((e) => ({ key: e.key, value: maskEnvValue(e.value) })),
    removed: raw.removed.map((e) => ({
      key: e.key,
      value: maskEnvValue(e.value),
    })),
    changed: raw.changed.map((e) => ({
      key: e.key,
      from: maskEnvValue(e.from),
      to: maskEnvValue(e.to),
    })),
    unchangedCount: raw.unchangedKeys.length,
    changeCount: countEnvDiffChanges(raw),
  });
}
