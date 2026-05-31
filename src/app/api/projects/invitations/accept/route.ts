import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, projectInvitation, projectMember, user } from "@/lib/db";
import { normalizeEmail } from "@/lib/project-access";

const Body = z.object({
  token: z.string().min(10),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const me = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const myEmail = normalizeEmail(me[0]?.email ?? "");

  const now = new Date();
  const inv = await db
    .select()
    .from(projectInvitation)
    .where(
      and(
        eq(projectInvitation.token, parsed.data.token),
        isNull(projectInvitation.acceptedAt),
        gt(projectInvitation.expiresAt, now),
      ),
    )
    .limit(1);

  const row = inv[0];
  if (!row) {
    return jsonError("NOT_FOUND", "Invalid or expired invitation.", 404);
  }

  if (normalizeEmail(row.email) !== myEmail) {
    return jsonError(
      "EMAIL_MISMATCH",
      "Sign in with the invited email address to accept.",
      403,
    );
  }

  const existing = await db
    .select({ id: projectMember.id })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, row.projectId),
        eq(projectMember.userId, session.user.id),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(projectInvitation)
      .set({ acceptedAt: now })
      .where(eq(projectInvitation.id, row.id));
    return jsonSuccess({ projectId: row.projectId, alreadyMember: true });
  }

  const role = row.role === "viewer" ? "viewer" : "editor";
  await db.insert(projectMember).values({
    id: nanoid(),
    projectId: row.projectId,
    userId: session.user.id,
    role,
    createdAt: now,
  });

  await db
    .update(projectInvitation)
    .set({ acceptedAt: now })
    .where(eq(projectInvitation.id, row.id));

  return jsonSuccess({ projectId: row.projectId, alreadyMember: false });
}
