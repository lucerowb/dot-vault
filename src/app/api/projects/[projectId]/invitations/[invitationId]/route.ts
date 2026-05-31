import { and, eq } from "drizzle-orm";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, projectInvitation } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";

type Ctx = { params: Promise<{ projectId: string; invitationId: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId, invitationId } = await ctx.params;
  const myRole = await getProjectAccessRole(session.user.id, projectId);
  if (!myRole || !canAccess(myRole, "owner")) {
    return jsonError(
      "FORBIDDEN",
      "Only the project owner can revoke invites.",
      403,
    );
  }

  const del = await db
    .delete(projectInvitation)
    .where(
      and(
        eq(projectInvitation.id, invitationId),
        eq(projectInvitation.projectId, projectId),
      ),
    )
    .returning({ id: projectInvitation.id });

  if (del.length === 0) {
    return jsonError("NOT_FOUND", "Invitation not found.", 404);
  }
  return jsonSuccess({ revoked: true });
}
