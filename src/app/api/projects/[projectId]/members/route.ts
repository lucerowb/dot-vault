import { and, eq, gt, isNull } from "drizzle-orm";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, project, projectInvitation, projectMember, user } from "@/lib/db";
import {
  canAccess,
  getProjectAccessRole,
} from "@/lib/project-access";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId } = await ctx.params;
  const myRole = await getProjectAccessRole(session.user.id, projectId);
  if (!myRole || !canAccess(myRole, "viewer")) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  const proj = await db
    .select({
      id: project.id,
      userId: project.userId,
    })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const p = proj[0];
  if (!p) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  const ownerUser = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, p.userId))
    .limit(1);

  const membersRows = await db
    .select({
      userId: projectMember.userId,
      role: projectMember.role,
      email: user.email,
      name: user.name,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(eq(projectMember.projectId, projectId));

  const members = [
    {
      userId: ownerUser[0]?.id ?? p.userId,
      email: ownerUser[0]?.email ?? "",
      name: ownerUser[0]?.name ?? "",
      role: "owner" as const,
    },
    ...membersRows.map((m) => ({
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role as "editor" | "viewer",
    })),
  ];

  let invitations: {
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
    createdAt: Date;
  }[] = [];

  if (myRole === "owner") {
    const now = new Date();
    invitations = await db
      .select({
        id: projectInvitation.id,
        email: projectInvitation.email,
        role: projectInvitation.role,
        expiresAt: projectInvitation.expiresAt,
        createdAt: projectInvitation.createdAt,
      })
      .from(projectInvitation)
      .where(
        and(
          eq(projectInvitation.projectId, projectId),
          isNull(projectInvitation.acceptedAt),
          gt(projectInvitation.expiresAt, now)
        )
      );
  }

  return jsonSuccess({ myRole, members, invitations });
}
