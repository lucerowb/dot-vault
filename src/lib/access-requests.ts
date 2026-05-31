// Access Requests system for temporary elevated permissions
import { z } from "zod";

export type AccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface AccessRequest {
  id: string;
  projectId: string;
  requesterUserId: string;
  requestedRole: "editor";
  reason?: string;
  status: AccessRequestStatus;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  expiresAt?: Date;
  token: string;
  createdAt: Date;
}

// Validation schemas
export const CreateAccessRequestSchema = z.object({
  reason: z.string().min(10).max(500).optional(),
  durationHours: z.number().int().min(1).max(24).default(4),
});

export const ReviewAccessRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  durationHours: z.number().int().min(1).max(24).optional(), // Only for approve
});

// Request duration options
export const REQUEST_DURATIONS = [
  { value: 1, label: "1 hour", description: "Quick fix or review" },
  { value: 2, label: "2 hours", description: "Short task" },
  { value: 4, label: "4 hours", description: "Half day" },
  { value: 8, label: "8 hours", description: "Full day" },
  { value: 24, label: "24 hours", description: "Extended access" },
];

// Common request reasons
export const COMMON_REQUEST_REASONS = [
  "Emergency bug fix in production",
  "Deploying critical security patch",
  "Investigating production incident",
  "Adding new environment variables",
  "Rotating expired secrets",
  "Updating configuration for new feature",
  "Temporary coverage for team member",
  "Auditing environment configuration",
];

/**
 * Calculate expiration date
 */
export function calculateExpiration(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

/**
 * Check if request is expired
 */
export function isRequestExpired(request: AccessRequest): boolean {
  if (request.status !== "approved") {
    return false;
  }

  if (!request.expiresAt) {
    return false;
  }

  return new Date() > request.expiresAt;
}

/**
 * Get request status with expiration check
 */
export function getRequestStatus(request: AccessRequest): AccessRequestStatus {
  if (request.status === "approved" && isRequestExpired(request)) {
    return "expired";
  }
  return request.status;
}

/**
 * Format request duration
 */
export function formatDuration(hours: number): string {
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${hours} hours`;
  return `${Math.floor(hours / 24)} days ${hours % 24} hours`;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Expired";
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m remaining`;
  }
  return `${diffMinutes}m remaining`;
}

/**
 * Generate access request email template
 */
export function generateRequestEmail(
  requesterName: string,
  requesterEmail: string,
  projectName: string,
  reason: string,
  duration: number,
  approveUrl: string,
  rejectUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `Access Request: ${requesterName} requests editor access to ${projectName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #111827; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 10px 5px; }
    .approve { background: #10b981; color: white; }
    .reject { background: #ef4444; color: white; }
    .info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔐 Access Request</h2>
    </div>
    <div class="content">
      <p><strong>${requesterName}</strong> (${requesterEmail}) is requesting editor access to <strong>${projectName}</strong>.</p>
      
      <div class="info">
        <div class="label">Duration</div>
        <div class="value">${formatDuration(duration)}</div>
      </div>
      
      <div class="info">
        <div class="label">Reason</div>
        <div class="value">${reason || "No reason provided"}</div>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" class="button approve">✓ Approve</a>
        <a href="${rejectUrl}" class="button reject">✕ Reject</a>
      </p>
      
      <p style="font-size: 14px; color: #6b7280;">
        This request will expire in 24 hours if not reviewed.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Access Request

${requesterName} (${requesterEmail}) is requesting editor access to ${projectName}.

Duration: ${formatDuration(duration)}
Reason: ${reason || "No reason provided"}

To approve this request, visit: ${approveUrl}
To reject this request, visit: ${rejectUrl}

This request will expire in 24 hours if not reviewed.
  `;

  return { subject, html, text };
}

/**
 * Generate approval notification email
 */
export function generateApprovalEmail(
  projectName: string,
  duration: number,
  expiresAt: Date,
  projectUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `Access Approved: Editor access to ${projectName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #111827; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 15px 0; }
    .info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✓ Access Approved</h2>
    </div>
    <div class="content">
      <p>Your request for editor access to <strong>${projectName}</strong> has been approved.</p>
      
      <div class="info">
        <strong>Duration:</strong> ${formatDuration(duration)}<br>
        <strong>Expires:</strong> ${expiresAt.toLocaleString()}
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Your elevated access will automatically expire at the time shown above. 
        Please complete your work before then.
      </div>
      
      <a href="${projectUrl}" class="button">Go to Project</a>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Access Approved

Your request for editor access to ${projectName} has been approved.

Duration: ${formatDuration(duration)}
Expires: ${expiresAt.toLocaleString()}

IMPORTANT: Your elevated access will automatically expire at the time shown above.
Please complete your work before then.

Go to project: ${projectUrl}
  `;

  return { subject, html, text };
}

/**
 * Generate rejection notification email
 */
export function generateRejectionEmail(
  projectName: string,
  projectUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `Access Request Declined: ${projectName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #111827; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✕ Request Declined</h2>
    </div>
    <div class="content">
      <p>Your request for editor access to <strong>${projectName}</strong> has been declined.</p>
      
      <p>If you believe this was a mistake, please contact the project owner directly.</p>
      
      <a href="${projectUrl}" class="button">View Project</a>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Request Declined

Your request for editor access to ${projectName} has been declined.

If you believe this was a mistake, please contact the project owner directly.

View project: ${projectUrl}
  `;

  return { subject, html, text };
}

/**
 * Check if user can review requests
 */
export function canReviewRequests(
  userRole: "owner" | "editor" | "viewer",
): boolean {
  return userRole === "owner" || userRole === "editor";
}

/**
 * Get pending requests count badge color
 */
export function getPendingCountColor(count: number): string {
  if (count === 0) return "gray";
  if (count <= 2) return "yellow";
  return "red";
}
