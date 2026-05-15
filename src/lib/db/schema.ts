import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Better Auth core tables (PostgreSQL / Supabase). */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  /** Two-factor authentication enabled */
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  /** TOTP secret for 2FA */
  twoFactorSecret: text("two_factor_secret"),
  /** Backup codes for 2FA recovery */
  twoFactorBackupCodes: text("two_factor_backup_codes"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Application: projects owned by a user. */
export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    /** IP allowlist - comma-separated CIDR ranges */
    ipAllowlist: text("ip_allowlist"),
    /** Require 2FA for all members */
    require2FA: boolean("require_2fa").notNull().default(false),
  },
  (table) => [
    uniqueIndex("project_user_slug_idx").on(table.userId, table.slug),
  ],
);

/** Stored .env blobs (AES-256-GCM at rest). */
export const projectEnv = pgTable(
  "project_env",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    iv: text("iv").notNull(),
    ciphertext: text("ciphertext").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("project_env_project_label_idx").on(
      table.projectId,
      table.label,
    ),
  ],
);

/** Collaborators with access to project envs (not the billing owner). */
export const projectMember = pgTable(
  "project_member",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** editor: read/write envs; viewer: read only */
    role: text("role").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("project_member_project_user_idx").on(
      table.projectId,
      table.userId,
    ),
  ],
);

/** Email invite until accepted or expired. */
export const projectInvitation = pgTable("project_invitation", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  token: text("token").notNull().unique(),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull(),
});

/** Version history for environment files. */
export const projectEnvVersion = pgTable("project_env_version", {
  id: text("id").primaryKey(),
  projectEnvId: text("project_env_id")
    .notNull()
    .references(() => projectEnv.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  iv: text("iv").notNull(),
  ciphertext: text("ciphertext").notNull(),
  /** Version number (1, 2, 3, ...) */
  version: text("version").notNull(),
  /** What changed: 'created', 'updated', 'deleted' */
  changeType: text("change_type").notNull(),
  /** User who made the change */
  changedByUserId: text("changed_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Optional comment describing the change */
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull(),
});

/** Audit log for all actions in the system. */
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  /** User who performed the action */
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Type of action: 'project_create', 'project_update', 'project_delete',
   * 'env_create', 'env_update', 'env_delete', 'env_view', 'member_invite',
   * 'member_accept', 'member_remove', 'login', 'logout', 'quick_share_create',
   * 'quick_share_view', 'quick_share_revoke' */
  action: text("action").notNull(),
  /** Resource being acted upon */
  resourceType: text("resource_type").notNull(), // 'project', 'env', 'member', 'user', 'quick_share'
  resourceId: text("resource_id"),
  /** Additional context as JSON */
  metadata: text("metadata"),
  /** IP address of the request */
  ipAddress: text("ip_address"),
  /** User agent string */
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull(),
});

/** Access requests for temporary elevated permissions */
export const accessRequest = pgTable("access_request", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  /** User requesting access */
  requesterUserId: text("requester_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Requested role: 'editor' */
  requestedRole: text("requested_role").notNull(),
  /** Reason for request */
  reason: text("reason"),
  /** Status: 'pending', 'approved', 'rejected', 'expired' */
  status: text("status").notNull().default("pending"),
  /** User who approved/rejected */
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  /** When the request was reviewed */
  reviewedAt: timestamp("reviewed_at"),
  /** When the elevated access expires */
  expiresAt: timestamp("expires_at"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
});

/** Break-glass emergency access */
export const emergencyAccess = pgTable("emergency_access", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  /** User requesting emergency access */
  requesterUserId: text("requester_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Emergency type: 'owner_unavailable', 'critical_incident', 'other' */
  emergencyType: text("emergency_type").notNull(),
  /** Description of the emergency */
  description: text("description"),
  /** Status: 'pending', 'approved', 'rejected', 'expired', 'used' */
  status: text("status").notNull().default("pending"),
  /** Approver 1 */
  approver1UserId: text("approver1_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  approver1ApprovedAt: timestamp("approver1_approved_at"),
  /** Approver 2 (for break-glass) */
  approver2UserId: text("approver2_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  approver2ApprovedAt: timestamp("approver2_approved_at"),
  /** When the emergency access expires */
  expiresAt: timestamp("expires_at"),
  /** When the access was used */
  usedAt: timestamp("used_at"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
});

/** Webhook configurations for notifications */
export const webhookConfig = pgTable("webhook_config", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  /** Webhook type: 'slack', 'discord', 'generic' */
  type: text("type").notNull(),
  /** Webhook URL */
  url: text("url").notNull(),
  /** Secret for signature verification */
  secret: text("secret"),
  /** Events to notify on (JSON array) */
  events: text("events").notNull(),
  /** Whether the webhook is active */
  isActive: boolean("is_active").notNull().default(true),
  /** Last error message */
  lastError: text("last_error"),
  /** Last successful delivery */
  lastSuccessAt: timestamp("last_success_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Secret rotation schedules */
export const secretRotation = pgTable("secret_rotation", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  envId: text("env_id")
    .notNull()
    .references(() => projectEnv.id, { onDelete: "cascade" }),
  /** Secret key to rotate */
  secretKey: text("secret_key").notNull(),
  /** Rotation interval in days */
  intervalDays: text("interval_days").notNull().default("90"),
  /** Last rotation timestamp */
  lastRotatedAt: timestamp("last_rotated_at"),
  /** Next scheduled rotation */
  nextRotationAt: timestamp("next_rotation_at"),
  /** Rotation status: 'active', 'paused', 'failed' */
  status: text("status").notNull().default("active"),
  /** Provider for rotation: 'aws', 'stripe', 'custom' */
  provider: text("provider"),
  /** Provider-specific configuration (JSON) */
  providerConfig: text("provider_config"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Environment sync configurations */
export const envSyncConfig = pgTable("env_sync_config", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  /** Source environment label */
  sourceEnvLabel: text("source_env_label").notNull(),
  /** Target environment label */
  targetEnvLabel: text("target_env_label").notNull(),
  /** Sync mode: 'manual', 'automatic' */
  syncMode: text("sync_mode").notNull().default("manual"),
  /** Whether approval is required */
  requireApproval: boolean("require_approval").notNull().default(true),
  /** Approvers (JSON array of user IDs) */
  approvers: text("approvers"),
  /** Last sync timestamp */
  lastSyncAt: timestamp("last_sync_at"),
  /** Last sync status */
  lastSyncStatus: text("last_sync_status"),
  /** Whether sync is active */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Pending sync approvals */
export const envSyncApproval = pgTable("env_sync_approval", {
  id: text("id").primaryKey(),
  syncConfigId: text("sync_config_id")
    .notNull()
    .references(() => envSyncConfig.id, { onDelete: "cascade" }),
  /** User who requested the sync */
  requesterUserId: text("requester_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Approver user ID */
  approverUserId: text("approver_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Status: 'pending', 'approved', 'rejected' */
  status: text("status").notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

/** API keys for programmatic access */
export const apiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** API key name */
  name: text("name").notNull(),
  /** Hashed API key */
  keyHash: text("key_hash").notNull().unique(),
  /** Key prefix for identification */
  keyPrefix: text("key_prefix").notNull(),
  /** Scopes (JSON array) */
  scopes: text("scopes").notNull(),
  /** Last used timestamp */
  lastUsedAt: timestamp("last_used_at"),
  /** Expiration date */
  expiresAt: timestamp("expires_at"),
  /** Whether the key is revoked */
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
});

/** Team workspaces (organizations) */
export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  /** Workspace name */
  name: text("name").notNull(),
  /** Workspace slug */
  slug: text("slug").notNull().unique(),
  /** Billing email */
  billingEmail: text("billing_email"),
  /** SSO provider configuration (JSON) */
  ssoConfig: text("sso_config"),
  /** Whether SSO is required */
  ssoRequired: boolean("sso_required").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Workspace members */
export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Role: 'owner', 'admin', 'member' */
    role: text("role").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("workspace_member_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

/** Workspace projects association */
export const workspaceProject = pgTable(
  "workspace_project",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("workspace_project_workspace_project_idx").on(
      table.workspaceId,
      table.projectId,
    ),
  ],
);

export const schema = {
  user,
  session,
  account,
  verification,
  project,
  projectEnv,
  projectMember,
  projectInvitation,
  projectEnvVersion,
  auditLog,
  accessRequest,
  emergencyAccess,
  webhookConfig,
  secretRotation,
  envSyncConfig,
  envSyncApproval,
  apiKey,
  workspace,
  workspaceMember,
  workspaceProject,
};
