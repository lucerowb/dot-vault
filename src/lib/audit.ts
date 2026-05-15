import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  listEnvVersionsWithUser,
  listProjectAuditLogsWithUser,
} from "@/lib/db/read-queries";
import { auditLog, projectEnvVersion } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export type AuditAction =
  | "project_create"
  | "project_update"
  | "project_delete"
  | "env_create"
  | "env_update"
  | "env_delete"
  | "env_view"
  | "env_version_rollback"
  | "member_invite"
  | "member_accept"
  | "member_remove"
  | "member_role_change"
  | "login"
  | "logout"
  | "quick_share_create"
  | "quick_share_view"
  | "quick_share_revoke";

export type ResourceType =
  | "project"
  | "env"
  | "member"
  | "user"
  | "quick_share"
  | "invitation";

interface AuditLogOptions {
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: options.userId,
      action: options.action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error("Failed to write audit log:", error);
  }
}

interface CreateVersionOptions {
  projectEnvId: string;
  projectId: string;
  label: string;
  iv: string;
  ciphertext: string;
  changeType: "created" | "updated" | "deleted";
  changedByUserId: string;
  comment?: string;
}

export async function createEnvVersion(
  options: CreateVersionOptions,
): Promise<void> {
  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectEnvVersion)
      .where(eq(projectEnvVersion.projectEnvId, options.projectEnvId));

    const versionNumber = (countResult[0]?.count ?? 0) + 1;

    await db.insert(projectEnvVersion).values({
      id: nanoid(),
      projectEnvId: options.projectEnvId,
      projectId: options.projectId,
      label: options.label,
      iv: options.iv,
      ciphertext: options.ciphertext,
      version: versionNumber.toString(),
      changeType: options.changeType,
      changedByUserId: options.changedByUserId,
      comment: options.comment || null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Don't fail the main operation if version creation fails
    console.error("Failed to create version:", error);
  }
}

export async function getEnvVersions(projectEnvId: string, limit = 50) {
  return listEnvVersionsWithUser(projectEnvId, limit);
}

export async function getVersionById(versionId: string) {
  return db.query.projectEnvVersion.findFirst({
    where: (table, { eq }) => eq(table.id, versionId),
  });
}

export async function getAuditLogsForProject(
  projectId: string,
  limit = 100,
  offset = 0,
) {
  const { logs } = await listProjectAuditLogsWithUser({
    projectId,
    limit,
    offset,
  });
  return logs;
}

export async function getAuditLogsForUser(
  userId: string,
  limit: number = 100,
  offset: number = 0,
) {
  return db.query.auditLog.findMany({
    where: (table, { eq }) => eq(table.userId, userId),
    orderBy: (table, { desc }) => desc(table.createdAt),
    limit,
    offset,
  });
}

export async function getRecentAuditLogs(limit = 100) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      userId: auditLog.userId,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
