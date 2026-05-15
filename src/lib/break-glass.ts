// Break-Glass Emergency Access system
// For critical situations when normal access is unavailable

import { z } from "zod";

export type EmergencyType = "owner_unavailable" | "critical_incident" | "other";
export type EmergencyStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "used";

export interface EmergencyAccess {
  id: string;
  projectId: string;
  requesterUserId: string;
  emergencyType: EmergencyType;
  description?: string;
  status: EmergencyStatus;
  approver1UserId?: string;
  approver1ApprovedAt?: Date;
  approver2UserId?: string;
  approver2ApprovedAt?: Date;
  expiresAt?: Date;
  usedAt?: Date;
  token: string;
  createdAt: Date;
}

// Validation schemas
export const CreateEmergencyRequestSchema = z.object({
  emergencyType: z.enum(["owner_unavailable", "critical_incident", "other"]),
  description: z.string().min(20).max(1000),
});

export const ReviewEmergencyRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

// Emergency type descriptions
export const EMERGENCY_TYPES = [
  {
    id: "owner_unavailable" as const,
    name: "Owner Unavailable",
    description: "Project owner is unreachable and urgent changes are needed",
    requiresApprovers: 2,
    autoExpireHours: 4,
  },
  {
    id: "critical_incident" as const,
    name: "Critical Incident",
    description:
      "Production outage or security incident requiring immediate access",
    requiresApprovers: 2,
    autoExpireHours: 2,
  },
  {
    id: "other" as const,
    name: "Other Emergency",
    description: "Other urgent situation requiring elevated access",
    requiresApprovers: 2,
    autoExpireHours: 4,
  },
];

// Emergency access duration (once approved)
export const EMERGENCY_DURATION_HOURS = 2;

/**
 * Calculate expiration date for emergency access
 */
export function calculateEmergencyExpiration(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

/**
 * Check if emergency access is expired
 */
export function isEmergencyExpired(emergency: EmergencyAccess): boolean {
  if (emergency.status !== "approved" && emergency.status !== "used") {
    return false;
  }

  if (!emergency.expiresAt) {
    return false;
  }

  return new Date() > emergency.expiresAt;
}

/**
 * Check if emergency access is fully approved
 */
export function isFullyApproved(emergency: EmergencyAccess): boolean {
  return !!(
    emergency.approver1UserId &&
    emergency.approver1ApprovedAt &&
    emergency.approver2UserId &&
    emergency.approver2ApprovedAt
  );
}

/**
 * Get number of approvals received
 */
export function getApprovalCount(emergency: EmergencyAccess): number {
  let count = 0;
  if (emergency.approver1UserId && emergency.approver1ApprovedAt) count++;
  if (emergency.approver2UserId && emergency.approver2ApprovedAt) count++;
  return count;
}

/**
 * Get number of approvals needed
 */
export function getRequiredApprovals(emergencyType: EmergencyType): number {
  const type = EMERGENCY_TYPES.find((t) => t.id === emergencyType);
  return type?.requiresApprovers || 2;
}

/**
 * Check if user can approve this request
 */
export function canApprove(
  emergency: EmergencyAccess,
  userId: string,
  userRole: "owner" | "editor" | "viewer",
): { canApprove: boolean; reason?: string } {
  // Can't approve if not owner
  if (userRole !== "owner") {
    return {
      canApprove: false,
      reason: "Only project owners can approve emergency access",
    };
  }

  // Can't approve own request
  if (emergency.requesterUserId === userId) {
    return {
      canApprove: false,
      reason: "You cannot approve your own emergency request",
    };
  }

  // Can't approve if already approved by this user
  if (
    emergency.approver1UserId === userId ||
    emergency.approver2UserId === userId
  ) {
    return {
      canApprove: false,
      reason: "You have already approved this request",
    };
  }

  // Can't approve if already fully approved
  if (isFullyApproved(emergency)) {
    return {
      canApprove: false,
      reason: "This request has already been fully approved",
    };
  }

  return { canApprove: true };
}

/**
 * Get emergency status with expiration check
 */
export function getEmergencyStatus(
  emergency: EmergencyAccess,
): EmergencyStatus {
  if (emergency.status === "approved" && isEmergencyExpired(emergency)) {
    return "expired";
  }
  return emergency.status;
}

/**
 * Format emergency type for display
 */
export function formatEmergencyType(type: EmergencyType): string {
  const types: Record<EmergencyType, string> = {
    owner_unavailable: "Owner Unavailable",
    critical_incident: "Critical Incident",
    other: "Other Emergency",
  };
  return types[type];
}

/**
 * Generate emergency request email template
 */
export function generateEmergencyRequestEmail(
  requesterName: string,
  requesterEmail: string,
  projectName: string,
  emergencyType: EmergencyType,
  description: string,
  approveUrl: string,
  rejectUrl: string,
  requiredApprovals: number,
): { subject: string; html: string; text: string } {
  const subject = `🚨 EMERGENCY ACCESS REQUEST: ${requesterName} - ${projectName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px; border: 2px solid #dc2626; }
    .button { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 10px 5px; }
    .approve { background: #10b981; color: white; }
    .reject { background: #6b7280; color: white; }
    .info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .warning { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚨 EMERGENCY ACCESS REQUEST</h2>
    </div>
    <div class="content">
      <div class="warning">
        <strong>URGENT:</strong> This is an emergency access request requiring ${requiredApprovals} approvals from project owners.
      </div>
      
      <p><strong>${requesterName}</strong> (${requesterEmail}) has requested emergency access to <strong>${projectName}</strong>.</p>
      
      <div class="info">
        <div class="label">Emergency Type</div>
        <div class="value">${formatEmergencyType(emergencyType)}</div>
      </div>
      
      <div class="info">
        <div class="label">Description</div>
        <div class="value">${description}</div>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" class="button approve">✓ Approve</a>
        <a href="${rejectUrl}" class="button reject">✕ Reject</a>
      </p>
      
      <p style="font-size: 14px; color: #6b7280;">
        This request requires ${requiredApprovals} owner approvals. Once approved, access will be granted for ${EMERGENCY_DURATION_HOURS} hours.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
🚨 EMERGENCY ACCESS REQUEST

URGENT: This is an emergency access request requiring ${requiredApprovals} approvals from project owners.

${requesterName} (${requesterEmail}) has requested emergency access to ${projectName}.

Emergency Type: ${formatEmergencyType(emergencyType)}
Description: ${description}

To approve: ${approveUrl}
To reject: ${rejectUrl}

This request requires ${requiredApprovals} owner approvals. Once approved, access will be granted for ${EMERGENCY_DURATION_HOURS} hours.
  `;

  return { subject, html, text };
}

/**
 * Generate approval notification email
 */
export function generateEmergencyApprovalEmail(
  projectName: string,
  approverCount: number,
  requiredApprovals: number,
  expiresAt: Date,
  projectUrl: string,
): { subject: string; html: string; text: string } {
  const isFullyApproved = approverCount >= requiredApprovals;
  const subject = isFullyApproved
    ? `🚨 Emergency Access APPROVED: ${projectName}`
    : `🚨 Emergency Access Update: ${approverCount}/${requiredApprovals} approvals - ${projectName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${isFullyApproved ? "#10b981" : "#f59e0b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: ${isFullyApproved ? "#f0fdf4" : "#fffbeb"}; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #111827; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 15px 0; }
    .info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${isFullyApproved ? "✓ Emergency Access Approved" : "⏳ Approval Received"}</h2>
    </div>
    <div class="content">
      ${
        isFullyApproved
          ? `<p>Your emergency access request for <strong>${projectName}</strong> has been fully approved.</p>`
          : `<p>Your emergency access request for <strong>${projectName}</strong> has received ${approverCount} of ${requiredApprovals} required approvals.</p>`
      }
      
      ${
        isFullyApproved
          ? `
      <div class="info">
        <strong>Access expires:</strong> ${expiresAt.toLocaleString()}<br>
        <strong>Duration:</strong> ${EMERGENCY_DURATION_HOURS} hours
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Your emergency access will automatically expire at the time shown above. 
        Please complete your work before then. All actions will be logged.
      </div>
      
      <a href="${projectUrl}" class="button">Access Project</a>
        `
          : `
      <p>You will be notified once the required number of approvals is reached.</p>
        `
      }
    </div>
  </div>
</body>
</html>
  `;

  const text = isFullyApproved
    ? `
Emergency Access Approved

Your emergency access request for ${projectName} has been fully approved.

Access expires: ${expiresAt.toLocaleString()}
Duration: ${EMERGENCY_DURATION_HOURS} hours

IMPORTANT: Your emergency access will automatically expire at the time shown above.
Please complete your work before then. All actions will be logged.

Access project: ${projectUrl}
    `
    : `
Approval Received

Your emergency access request for ${projectName} has received ${approverCount} of ${requiredApprovals} required approvals.

You will be notified once the required number of approvals is reached.
    `;

  return { subject, html, text };
}

/**
 * Generate rejection notification email
 */
export function generateEmergencyRejectionEmail(
  projectName: string,
  projectUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `🚨 Emergency Access Declined: ${projectName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #111827; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✕ Emergency Access Declined</h2>
    </div>
    <div class="content">
      <p>Your emergency access request for <strong>${projectName}</strong> has been declined.</p>
      
      <p>If this is still an urgent matter, please contact the project owners directly or escalate through your organization's incident response process.</p>
      
      <a href="${projectUrl}" class="button">View Project</a>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Emergency Access Declined

Your emergency access request for ${projectName} has been declined.

If this is still an urgent matter, please contact the project owners directly or escalate through your organization's incident response process.

View project: ${projectUrl}
  `;

  return { subject, html, text };
}

/**
 * Get emergency access status badge
 */
export function getEmergencyStatusBadge(status: EmergencyStatus): {
  label: string;
  color: string;
} {
  const badges: Record<EmergencyStatus, { label: string; color: string }> = {
    pending: { label: "Pending", color: "yellow" },
    approved: { label: "Approved", color: "green" },
    rejected: { label: "Rejected", color: "red" },
    expired: { label: "Expired", color: "gray" },
    used: { label: "Used", color: "blue" },
  };
  return badges[status];
}

/**
 * Validate emergency description
 */
export function validateEmergencyDescription(description: string): {
  valid: boolean;
  error?: string;
} {
  if (!description || description.trim().length < 20) {
    return {
      valid: false,
      error: "Please provide a detailed description (at least 20 characters)",
    };
  }

  if (description.length > 1000) {
    return {
      valid: false,
      error: "Description too long (max 1000 characters)",
    };
  }

  return { valid: true };
}
