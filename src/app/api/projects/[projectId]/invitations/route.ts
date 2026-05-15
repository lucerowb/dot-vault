import { and, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, project, projectInvitation, projectMember, user } from "@/lib/db";
import {
  canAccess,
  getProjectAccessRole,
  normalizeEmail,
} from "@/lib/project-access";

const InviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId } = await ctx.params;
  const myRole = await getProjectAccessRole(session.user.id, projectId);
  if (!myRole || !canAccess(myRole, "owner")) {
    return jsonError("FORBIDDEN", "Only the project owner can invite.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }
  const parsed = InviteBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const proj = await db
    .select({ ownerId: project.userId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const ownerId = proj[0]?.ownerId;
  if (!ownerId) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  const ownerRow = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);
  if (normalizeEmail(ownerRow[0]?.email ?? "") === email) {
    return jsonError("INVALID_INVITE", "Owner already has access.", 400);
  }

  const existingMember = await db
    .select({ userId: user.id })
    .from(user)
    .innerJoin(projectMember, eq(projectMember.userId, user.id))
    .where(
      and(
        eq(projectMember.projectId, projectId),
        sql`lower(${user.email}) = ${email}`,
      ),
    )
    .limit(1);
  if (existingMember.length > 0) {
    return jsonError(
      "ALREADY_MEMBER",
      "That user is already on this project.",
      409,
    );
  }

  await db
    .delete(projectInvitation)
    .where(
      and(
        eq(projectInvitation.projectId, projectId),
        eq(projectInvitation.email, email),
        isNull(projectInvitation.acceptedAt),
      ),
    );

  const id = nanoid();
  const token = nanoid(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  await db.insert(projectInvitation).values({
    id,
    projectId,
    email,
    role: parsed.data.role,
    token,
    invitedByUserId: session.user.id,
    expiresAt,
    acceptedAt: null,
    createdAt: now,
  });

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;
  const acceptPath = `/invite/${token}`;

  return jsonSuccess(
    {
      id,
      email,
      role: parsed.data.role,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
      acceptUrl: `${base}${acceptPath}`,
    },
    { status: 201 },
  );
}
