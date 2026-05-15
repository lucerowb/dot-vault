import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, project } from "@/lib/db";
import { slugify } from "@/lib/project-slug";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(64).optional(),
});

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

  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  return jsonSuccess({
    ...row,
    myRole,
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId } = await ctx.params;
  const myRole = await getProjectAccessRole(session.user.id, projectId);
  if (!myRole || !canAccess(myRole, "owner")) {
    return jsonError(
      "FORBIDDEN",
      "Only the project owner can edit settings.",
      403,
    );
  }

  const rows = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const nextName = parsed.data.name?.trim() ?? row.name;
  const nextSlug = parsed.data.slug ? slugify(parsed.data.slug) : row.slug;

  if (nextSlug !== row.slug) {
    const taken = await db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.userId, row.userId), eq(project.slug, nextSlug)))
      .limit(1);
    const takenRow = taken[0];
    if (takenRow && takenRow.id !== projectId) {
      return jsonError("SLUG_TAKEN", "Slug already in use.", 409);
    }
  }

  const now = new Date();
  await db
    .update(project)
    .set({
      name: nextName,
      slug: nextSlug,
      updatedAt: now,
    })
    .where(eq(project.id, projectId));

  return jsonSuccess({
    id: row.id,
    name: nextName,
    slug: nextSlug,
    createdAt: row.createdAt,
    updatedAt: now,
    myRole: "owner" as const,
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId } = await ctx.params;
  const myRole = await getProjectAccessRole(session.user.id, projectId);
  if (!myRole || !canAccess(myRole, "owner")) {
    return jsonError(
      "FORBIDDEN",
      "Only the project owner can delete the project.",
      403,
    );
  }

  await db.delete(project).where(eq(project.id, projectId));
  return new Response(null, { status: 204 });
}
