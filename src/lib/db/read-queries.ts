import { and, desc, eq, or, sql } from "drizzle-orm";

import { db } from "./index";
import { auditLog, projectEnvVersion, user } from "./schema";

/** Project-scoped audit filter (resource row or metadata.projectId). */
export function auditLogProjectScope(projectId: string) {
  return or(
    and(
      eq(auditLog.resourceType, "project"),
      eq(auditLog.resourceId, projectId),
    ),
    sql`${auditLog.metadata}::jsonb @> ${JSON.stringify({ projectId })}::jsonb`,
  );
}

export async function listEnvVersionsWithUser(
  projectEnvId: string,
  limit = 50,
) {
  const rows = await db
    .select({
      id: projectEnvVersion.id,
      version: projectEnvVersion.version,
      changeType: projectEnvVersion.changeType,
      comment: projectEnvVersion.comment,
      createdAt: projectEnvVersion.createdAt,
      changedByName: user.name,
      changedByEmail: user.email,
    })
    .from(projectEnvVersion)
    .innerJoin(user, eq(projectEnvVersion.changedByUserId, user.id))
    .where(eq(projectEnvVersion.projectEnvId, projectEnvId))
    .orderBy(desc(projectEnvVersion.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    changeType: row.changeType as "created" | "updated" | "deleted",
    comment: row.comment,
    createdAt: row.createdAt,
    changedBy: {
      name: row.changedByName,
      email: row.changedByEmail,
    },
  }));
}

export async function listProjectAuditLogsWithUser(options: {
  projectId: string;
  limit: number;
  offset: number;
  action?: string;
}) {
  const { projectId, limit, offset, action } = options;
  const scope = auditLogProjectScope(projectId);
  const whereClause = action ? and(scope, eq(auditLog.action, action)) : scope;

  const logs = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.userId, user.id))
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: {
        name: log.userName,
        email: log.userEmail,
      },
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    },
  };
}
