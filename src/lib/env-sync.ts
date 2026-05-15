// Environment synchronization with approval gates
// Sync secrets between environments (e.g., staging → production)

import { z } from "zod";

export type SyncMode = "manual" | "automatic";
export type SyncStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "failed";

export interface SyncConfig {
  id: string;
  projectId: string;
  sourceEnvLabel: string;
  targetEnvLabel: string;
  syncMode: SyncMode;
  requireApproval: boolean;
  approvers: string[]; // User IDs
  isActive: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: SyncStatus;
}

export interface SyncApproval {
  id: string;
  syncConfigId: string;
  requesterUserId: string;
  approverUserId: string;
  status: "pending" | "approved" | "rejected";
  approvedAt?: Date;
  token: string;
  expiresAt: Date;
}

export interface SyncRequest {
  id: string;
  configId: string;
  requesterUserId: string;
  sourceEnvId: string;
  targetEnvId: string;
  changes: Array<{
    key: string;
    oldValue: string;
    newValue: string;
    action: "add" | "update" | "delete";
  }>;
  status: SyncStatus;
  requestedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

// Validation schemas
export const SyncConfigSchema = z.object({
  sourceEnvLabel: z.string().min(1, "Source environment is required"),
  targetEnvLabel: z.string().min(1, "Target environment is required"),
  syncMode: z.enum(["manual", "automatic"]),
  requireApproval: z.boolean().default(true),
  approvers: z.array(z.string()).min(1, "At least one approver is required"),
});

/**
 * Compare two environment contents and generate diff
 */
export function generateEnvDiff(
  sourceContent: string,
  targetContent: string,
): Array<{
  key: string;
  sourceValue: string;
  targetValue: string;
  action: "add" | "update" | "delete" | "unchanged";
}> {
  const sourceVars = parseEnvContent(sourceContent);
  const targetVars = parseEnvContent(targetContent);

  const allKeys = new Set([
    ...Object.keys(sourceVars),
    ...Object.keys(targetVars),
  ]);

  const diff: Array<{
    key: string;
    sourceValue: string;
    targetValue: string;
    action: "add" | "update" | "delete" | "unchanged";
  }> = [];

  for (const key of allKeys) {
    const sourceValue = sourceVars[key] || "";
    const targetValue = targetVars[key] || "";

    if (!sourceVars[key] && targetVars[key]) {
      // In target but not source - will be deleted
      diff.push({
        key,
        sourceValue: "",
        targetValue,
        action: "delete",
      });
    } else if (sourceVars[key] && !targetVars[key]) {
      // In source but not target - will be added
      diff.push({
        key,
        sourceValue,
        targetValue: "",
        action: "add",
      });
    } else if (sourceValue !== targetValue) {
      // Both exist but different - will be updated
      diff.push({
        key,
        sourceValue,
        targetValue,
        action: "update",
      });
    } else {
      // Unchanged
      diff.push({
        key,
        sourceValue,
        targetValue,
        action: "unchanged",
      });
    }
  }

  // Sort: changes first, then unchanged
  return diff.sort((a, b) => {
    if (a.action === "unchanged" && b.action !== "unchanged") return 1;
    if (a.action !== "unchanged" && b.action === "unchanged") return -1;
    return a.key.localeCompare(b.key);
  });
}

/**
 * Parse .env content into key-value pairs
 */
function parseEnvContent(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

/**
 * Apply diff to target environment
 */
export function applyEnvDiff(
  targetContent: string,
  diff: Array<{
    key: string;
    sourceValue: string;
    action: "add" | "update" | "delete" | "unchanged";
  }>,
): string {
  const targetVars = parseEnvContent(targetContent);

  for (const change of diff) {
    switch (change.action) {
      case "add":
      case "update":
        targetVars[change.key] = change.sourceValue;
        break;
      case "delete":
        delete targetVars[change.key];
        break;
    }
  }

  // Reconstruct .env content
  const lines = Object.entries(targetVars).map(([key, value]) => {
    // Escape special characters
    const escapedValue = value
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/"/g, '\\"');

    // Quote values with spaces or special chars
    if (escapedValue.includes(" ") || escapedValue.includes("#")) {
      return `${key}="${escapedValue}"`;
    }

    return `${key}=${escapedValue}`;
  });

  return lines.join("\n");
}

/**
 * Validate sync configuration
 */
export function validateSyncConfig(
  config: Partial<SyncConfig>,
  existingEnvLabels: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.sourceEnvLabel) {
    errors.push("Source environment is required");
  } else if (!existingEnvLabels.includes(config.sourceEnvLabel)) {
    errors.push(`Source environment "${config.sourceEnvLabel}" does not exist`);
  }

  if (!config.targetEnvLabel) {
    errors.push("Target environment is required");
  } else if (!existingEnvLabels.includes(config.targetEnvLabel)) {
    errors.push(`Target environment "${config.targetEnvLabel}" does not exist`);
  }

  if (config.sourceEnvLabel === config.targetEnvLabel) {
    errors.push("Source and target environments must be different");
  }

  if (
    config.requireApproval &&
    (!config.approvers || config.approvers.length === 0)
  ) {
    errors.push("At least one approver is required when approval is enabled");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if sync is allowed (no conflicts, valid config)
 */
export function canSync(
  config: SyncConfig,
  userId: string,
  isApprover: boolean,
): { allowed: boolean; reason?: string } {
  if (!config.isActive) {
    return { allowed: false, reason: "Sync configuration is inactive" };
  }

  if (config.syncMode === "automatic") {
    return { allowed: true };
  }

  if (config.requireApproval && !isApprover) {
    return {
      allowed: false,
      reason: "This sync requires approval from a designated approver",
    };
  }

  return { allowed: true };
}

/**
 * Generate sync preview
 */
export function generateSyncPreview(
  sourceContent: string,
  targetContent: string,
): {
  totalChanges: number;
  additions: number;
  updates: number;
  deletions: number;
  unchanged: number;
  diff: ReturnType<typeof generateEnvDiff>;
} {
  const diff = generateEnvDiff(sourceContent, targetContent);

  const additions = diff.filter((d) => d.action === "add").length;
  const updates = diff.filter((d) => d.action === "update").length;
  const deletions = diff.filter((d) => d.action === "delete").length;
  const unchanged = diff.filter((d) => d.action === "unchanged").length;

  return {
    totalChanges: additions + updates + deletions,
    additions,
    updates,
    deletions,
    unchanged,
    diff,
  };
}

/**
 * Get sync status summary
 */
export function getSyncStatus(config: SyncConfig): {
  status: string;
  lastSync: string;
  nextSync?: string;
} {
  const lastSync = config.lastSyncAt
    ? formatRelativeTime(config.lastSyncAt)
    : "Never";

  if (!config.isActive) {
    return {
      status: "Inactive",
      lastSync,
    };
  }

  if (config.syncMode === "automatic") {
    return {
      status: "Automatic",
      lastSync,
      nextSync: "On change",
    };
  }

  return {
    status: config.requireApproval ? "Approval Required" : "Manual",
    lastSync,
  };
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Common environment promotion paths
 */
export const COMMON_SYNC_PATHS = [
  { source: "development", target: "staging", description: "Dev → Staging" },
  {
    source: "staging",
    target: "production",
    description: "Staging → Production",
  },
  { source: "dev", target: "prod", description: "Dev → Prod" },
];

/**
 * Mask sensitive values in diff preview
 */
export function maskDiffValues(
  diff: ReturnType<typeof generateEnvDiff>,
  maskLength = 8,
): ReturnType<typeof generateEnvDiff> {
  return diff.map((item) => ({
    ...item,
    sourceValue: maskValue(item.sourceValue, maskLength),
    targetValue: maskValue(item.targetValue, maskLength),
  }));
}

/**
 * Mask a value for display
 */
function maskValue(value: string, visibleLength: number): string {
  if (!value || value.length <= visibleLength * 2) {
    return "*".repeat(value.length);
  }
  return value.slice(0, visibleLength) + "***" + value.slice(-visibleLength);
}
