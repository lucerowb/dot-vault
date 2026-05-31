import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { project, projectMember } from "@/lib/db/schema";

export type CollaboratorRole = "editor" | "viewer";
export type ProjectAccessRole = "owner" | CollaboratorRole;

const rank: Record<ProjectAccessRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export function canAccess(
  role: ProjectAccessRole | null,
  need: "viewer" | "editor" | "owner",
): boolean {
  if (!role) return false;
  return rank[role] >= rank[need];
}

export async function getProjectAccessRole(
  userId: string,
  projectId: string,
): Promise<ProjectAccessRole | null> {
  const rows = await db
    .select({ ownerId: project.userId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const p = rows[0];
  if (!p) return null;
  if (p.ownerId === userId) return "owner";

  const m = await db
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
      ),
    )
    .limit(1);
  const role = m[0]?.role;
  if (role === "editor" || role === "viewer") return role;
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ListedProject = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  myRole: ProjectAccessRole;
};

export async function listProjectsForUser(
  userId: string,
): Promise<ListedProject[]> {
  const owned = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(eq(project.userId, userId));

  const memberRows = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      memberRole: projectMember.role,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(eq(projectMember.userId, userId));

  const ownedMapped: ListedProject[] = owned.map((r) => ({
    ...r,
    myRole: "owner" as const,
  }));

  const memberIds = new Set(owned.map((o) => o.id));
  const fromMembership: ListedProject[] = [];
  for (const r of memberRows) {
    if (memberIds.has(r.id)) continue;
    const mr = r.memberRole;
    if (mr !== "editor" && mr !== "viewer") continue;
    fromMembership.push({
      id: r.id,
      name: r.name,
      slug: r.slug,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      myRole: mr,
    });
  }

  return [...ownedMapped, ...fromMembership];
}
