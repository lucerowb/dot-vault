import { and, eq, gt, isNull } from "drizzle-orm";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { db, project, projectInvitation } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return jsonError("TOKEN_REQUIRED", "Missing token query parameter.", 400);
  }

  const now = new Date();
  const rows = await db
    .select({
      email: projectInvitation.email,
      role: projectInvitation.role,
      expiresAt: projectInvitation.expiresAt,
      projectName: project.name,
    })
    .from(projectInvitation)
    .innerJoin(project, eq(project.id, projectInvitation.projectId))
    .where(
      and(
        eq(projectInvitation.token, token),
        isNull(projectInvitation.acceptedAt),
        gt(projectInvitation.expiresAt, now)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return jsonError("NOT_FOUND", "Invalid or expired invitation.", 404);
  }

  return jsonSuccess({
    projectName: row.projectName,
    email: row.email,
    role: row.role,
    expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
  });
}
