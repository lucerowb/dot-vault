import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { db, project } from "@/lib/db";
import { slugify } from "@/lib/project-slug";
import { listProjectsForUser } from "@/lib/project-access";
import { logAuditEvent } from "@/lib/audit";

const CreateProjectBody = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
});

function getClientInfo(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const rows = await listProjectsForUser(session.user.id);
  return jsonSuccess(rows);
}

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

  const parsed = CreateProjectBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const slug = slugify(parsed.data.slug ?? parsed.data.name);
  const id = nanoid();
  const now = new Date();

  const taken = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.userId, session.user.id), eq(project.slug, slug)))
    .limit(1);

  if (taken.length > 0) {
    return jsonError(
      "SLUG_TAKEN",
      "You already have a project with this slug. Pick a different name.",
      409,
    );
  }

  await db.insert(project).values({
    id,
    userId: session.user.id,
    name: parsed.data.name.trim(),
    slug,
    createdAt: now,
    updatedAt: now,
  });

  // Log audit event
  const clientInfo = getClientInfo(request);
  await logAuditEvent({
    userId: session.user.id,
    action: "project_create",
    resourceType: "project",
    resourceId: id,
    metadata: { name: parsed.data.name.trim(), slug },
    ...clientInfo,
  });

  return jsonSuccess(
    { id, name: parsed.data.name.trim(), slug, createdAt: now, updatedAt: now },
    { status: 201 },
  );
}
