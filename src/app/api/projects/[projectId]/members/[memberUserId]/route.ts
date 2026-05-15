import { and, eq } from "drizzle-orm";

import { jsonError } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, project, projectMember } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";

type Ctx = { params: Promise<{ projectId: string; memberUserId: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId, memberUserId } = await ctx.params;
  const myRole = await getProjectAccessRole(session.user.id, projectId);
  if (!myRole || !canAccess(myRole, "owner")) {
    return jsonError(
      "FORBIDDEN",
      "Only the project owner can remove members.",
      403,
    );
  }

  const proj = await db
    .select({ ownerId: project.userId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  if (proj[0]?.ownerId === memberUserId) {
    return jsonError("INVALID", "Cannot remove the project owner.", 400);
  }

  const del = await db
    .delete(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, memberUserId),
      ),
    )
    .returning({ id: projectMember.id });

  if (del.length === 0) {
    return jsonError("NOT_FOUND", "Member not found.", 404);
  }
  return new Response(null, { status: 204 });
}
