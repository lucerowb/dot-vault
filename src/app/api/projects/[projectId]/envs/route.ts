import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { encryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";

const MAX_ENV_BYTES = 512_000;

const CreateEnvBody = z.object({
  label: z.string().min(1).max(80),
  content: z.string().max(MAX_ENV_BYTES),
});

type Ctx = { params: Promise<{ projectId: string }> };

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
      403
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
      400
    );
  }

  try {
    const { iv, ciphertext } = encryptBlob(parsed.data.content);
    const now = new Date();
    const label = parsed.data.label.trim();

    const dup = await db
      .select({
        id: projectEnv.id,
        createdAt: projectEnv.createdAt,
      })
      .from(projectEnv)
      .where(
        and(eq(projectEnv.projectId, projectId), eq(projectEnv.label, label))
      )
      .limit(1);

    if (dup.length > 0) {
      await db
        .update(projectEnv)
        .set({
          iv,
          ciphertext,
          updatedAt: now,
        })
        .where(eq(projectEnv.id, dup[0].id));

      return jsonSuccess(
        {
          id: dup[0].id,
          label,
          createdAt: dup[0].createdAt,
          updatedAt: now,
        },
        { status: 200 }
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

    return jsonSuccess(
      { id, label, createdAt: now, updatedAt: now },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption failed";
    if (msg.includes("STORAGE_ENCRYPTION_KEY")) {
      return jsonError(
        "SERVICE_MISCONFIGURED",
        "Server encryption key is not configured.",
        503
      );
    }
    console.error(e);
    return jsonError("INTERNAL_ERROR", "Could not save env file.", 500);
  }
}
