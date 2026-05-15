// Notification system for Slack, Discord, and webhooks
import { db } from "@/lib/db";
import { webhookConfig, type auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type WebhookType = "slack" | "discord" | "generic";

export type WebhookEvent =
  | "env.created"
  | "env.updated"
  | "env.deleted"
  | "env.viewed"
  | "member.invited"
  | "member.joined"
  | "member.removed"
  | "access.requested"
  | "access.approved"
  | "emergency.access.used"
  | "secret.rotated"
  | "sync.completed"
  | "login.failed"
  | "login.succeeded";

interface NotificationPayload {
  event: WebhookEvent;
  projectId: string;
  projectName: string;
  user: {
    name: string;
    email: string;
  };
  timestamp: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Send notification to all configured webhooks for a project
 */
export async function sendNotification(
  projectId: string,
  event: WebhookEvent,
  payload: Omit<NotificationPayload, "event" | "projectId">,
): Promise<void> {
  // Get all active webhooks for this project that subscribe to this event
  const webhooks = await db.query.webhookConfig.findMany({
    where: and(
      eq(webhookConfig.projectId, projectId),
      eq(webhookConfig.isActive, true),
    ),
  });

  for (const webhook of webhooks) {
    try {
      const events = JSON.parse(webhook.events) as Array<WebhookEvent | "*">;
      if (!events.includes(event) && !events.includes("*")) {
        continue;
      }

      await sendWebhookNotification(webhook, {
        event,
        projectId,
        ...payload,
      });
    } catch (error) {
      console.error(
        `Failed to send notification to webhook ${webhook.id}:`,
        error,
      );

      // Update last error
      await db
        .update(webhookConfig)
        .set({
          lastError: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(webhookConfig.id, webhook.id));
    }
  }
}

/**
 * Send notification to a specific webhook
 */
async function sendWebhookNotification(
  webhook: typeof webhookConfig.$inferSelect,
  payload: NotificationPayload,
): Promise<void> {
  switch (webhook.type) {
    case "slack":
      await sendSlackNotification(webhook.url, payload, webhook.secret);
      break;
    case "discord":
      await sendDiscordNotification(webhook.url, payload, webhook.secret);
      break;
    case "generic":
      await sendGenericNotification(webhook.url, payload, webhook.secret);
      break;
  }

  // Update last success
  await db
    .update(webhookConfig)
    .set({
      lastSuccessAt: new Date(),
      lastError: null,
    })
    .where(eq(webhookConfig.id, webhook.id));
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
  url: string,
  payload: NotificationPayload,
  secret?: string | null,
): Promise<void> {
  const eventColors: Record<WebhookEvent, string> = {
    "env.created": "#10b981",
    "env.updated": "#3b82f6",
    "env.deleted": "#ef4444",
    "env.viewed": "#6b7280",
    "member.invited": "#8b5cf6",
    "member.joined": "#10b981",
    "member.removed": "#f59e0b",
    "access.requested": "#f59e0b",
    "access.approved": "#10b981",
    "emergency.access.used": "#dc2626",
    "secret.rotated": "#3b82f6",
    "sync.completed": "#10b981",
    "login.failed": "#ef4444",
    "login.succeeded": "#10b981",
  };

  const eventTitles: Record<WebhookEvent, string> = {
    "env.created": "📝 Environment Created",
    "env.updated": "✏️ Environment Updated",
    "env.deleted": "🗑️ Environment Deleted",
    "env.viewed": "👁️ Environment Viewed",
    "member.invited": "📧 Member Invited",
    "member.joined": "✅ Member Joined",
    "member.removed": "❌ Member Removed",
    "access.requested": "🔑 Access Requested",
    "access.approved": "✅ Access Approved",
    "emergency.access.used": "🚨 Emergency Access Used",
    "secret.rotated": "🔄 Secret Rotated",
    "sync.completed": "🔄 Sync Completed",
    "login.failed": "❌ Login Failed",
    "login.succeeded": "✅ Login Succeeded",
  };

  const slackPayload = {
    attachments: [
      {
        color: eventColors[payload.event] || "#6b7280",
        title: eventTitles[payload.event] || payload.event,
        fields: [
          {
            title: "Project",
            value: payload.projectName,
            short: true,
          },
          {
            title: "User",
            value: `${payload.user.name} (${payload.user.email})`,
            short: true,
          },
          ...(payload.ipAddress
            ? [
                {
                  title: "IP Address",
                  value: payload.ipAddress,
                  short: true,
                },
              ]
            : []),
          ...(payload.details.label
            ? [
                {
                  title: "Environment",
                  value: String(payload.details.label),
                  short: true,
                },
              ]
            : []),
          ...(payload.details.reason
            ? [
                {
                  title: "Reason",
                  value: String(payload.details.reason),
                  short: false,
                },
              ]
            : []),
        ],
        footer: "DotVault",
        ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
      },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(slackPayload))
      .digest("hex");
    headers["X-DotVault-Signature"] = `sha256=${signature}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(slackPayload),
  });

  if (!response.ok) {
    throw new Error(
      `Slack webhook failed: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Send Discord notification
 */
async function sendDiscordNotification(
  url: string,
  payload: NotificationPayload,
  secret?: string | null,
): Promise<void> {
  const eventColors: Record<WebhookEvent, number> = {
    "env.created": 0x10b981,
    "env.updated": 0x3b82f6,
    "env.deleted": 0xef4444,
    "env.viewed": 0x6b7280,
    "member.invited": 0x8b5cf6,
    "member.joined": 0x10b981,
    "member.removed": 0xf59e0b,
    "access.requested": 0xf59e0b,
    "access.approved": 0x10b981,
    "emergency.access.used": 0xdc2626,
    "secret.rotated": 0x3b82f6,
    "sync.completed": 0x10b981,
    "login.failed": 0xef4444,
    "login.succeeded": 0x10b981,
  };

  const eventTitles: Record<WebhookEvent, string> = {
    "env.created": "📝 Environment Created",
    "env.updated": "✏️ Environment Updated",
    "env.deleted": "🗑️ Environment Deleted",
    "env.viewed": "👁️ Environment Viewed",
    "member.invited": "📧 Member Invited",
    "member.joined": "✅ Member Joined",
    "member.removed": "❌ Member Removed",
    "access.requested": "🔑 Access Requested",
    "access.approved": "✅ Access Approved",
    "emergency.access.used": "🚨 Emergency Access Used",
    "secret.rotated": "🔄 Secret Rotated",
    "sync.completed": "🔄 Sync Completed",
    "login.failed": "❌ Login Failed",
    "login.succeeded": "✅ Login Succeeded",
  };

  const fields = [
    {
      name: "Project",
      value: payload.projectName,
      inline: true,
    },
    {
      name: "User",
      value: `${payload.user.name} (${payload.user.email})`,
      inline: true,
    },
  ];

  if (payload.ipAddress) {
    fields.push({
      name: "IP Address",
      value: payload.ipAddress,
      inline: true,
    });
  }

  if (payload.details.label) {
    fields.push({
      name: "Environment",
      value: String(payload.details.label),
      inline: true,
    });
  }

  if (payload.details.reason) {
    fields.push({
      name: "Reason",
      value: String(payload.details.reason),
      inline: false,
    });
  }

  const discordPayload = {
    embeds: [
      {
        title: eventTitles[payload.event] || payload.event,
        color: eventColors[payload.event] || 0x6b7280,
        fields,
        footer: {
          text: "DotVault",
        },
        timestamp: payload.timestamp,
      },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(discordPayload))
      .digest("hex");
    headers["X-DotVault-Signature"] = `sha256=${signature}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(discordPayload),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Send generic webhook notification
 */
async function sendGenericNotification(
  url: string,
  payload: NotificationPayload,
  secret?: string | null,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "DotVault/1.0",
  };

  if (secret) {
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    headers["X-DotVault-Signature"] = `sha256=${signature}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      source: "dotvault",
      version: "1.0",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Generic webhook failed: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Test a webhook configuration
 */
export async function testWebhook(
  webhookId: string,
): Promise<{ success: boolean; error?: string }> {
  const webhook = await db.query.webhookConfig.findFirst({
    where: eq(webhookConfig.id, webhookId),
  });

  if (!webhook) {
    return { success: false, error: "Webhook not found" };
  }

  const testPayload: NotificationPayload = {
    event: "env.viewed",
    projectId: webhook.projectId,
    projectName: "Test Project",
    user: {
      name: "Test User",
      email: "test@example.com",
    },
    timestamp: new Date().toISOString(),
    details: {
      label: "test-environment",
      message: "This is a test notification from DotVault",
    },
  };

  try {
    await sendWebhookNotification(webhook, testPayload);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send notification from audit log entry
 */
export async function notifyFromAuditLog(
  auditEntry: typeof auditLog.$inferSelect,
  projectName: string,
): Promise<void> {
  const eventMap: Record<string, WebhookEvent> = {
    env_create: "env.created",
    env_update: "env.updated",
    env_delete: "env.deleted",
    env_view: "env.viewed",
    member_invite: "member.invited",
    member_accept: "member.joined",
    member_remove: "member.removed",
    access_request: "access.requested",
    access_approve: "access.approved",
    emergency_access_used: "emergency.access.used",
    secret_rotated: "secret.rotated",
    sync_completed: "sync.completed",
    login_failed: "login.failed",
    login: "login.succeeded",
  };

  const event = eventMap[auditEntry.action];
  if (!event) {
    return;
  }

  const metadata = auditEntry.metadata ? JSON.parse(auditEntry.metadata) : {};

  await sendNotification(auditEntry.userId, event, {
    projectName,
    user: {
      name: "Unknown", // Would need to fetch from user table
      email: "unknown@example.com",
    },
    timestamp: auditEntry.createdAt.toISOString(),
    details: metadata,
    ipAddress: auditEntry.ipAddress || undefined,
  });
}
