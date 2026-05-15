// Team Workspaces with SSO support
import { z } from "zod";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  billingEmail?: string;
  ssoConfig?: SSOConfig;
  ssoRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
}

export interface SSOConfig {
  provider: "saml" | "oidc";
  entryPoint?: string; // SAML
  issuer?: string; // SAML
  cert?: string; // SAML
  clientId?: string; // OIDC
  clientSecret?: string; // OIDC
  authorizationUrl?: string; // OIDC
  tokenUrl?: string; // OIDC
  userInfoUrl?: string; // OIDC
  scopes?: string[]; // OIDC
}

// Validation schemas
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  billingEmail: z.string().email().optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  billingEmail: z.string().email().optional(),
  ssoRequired: z.boolean().optional(),
});

export const AddWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const SSOConfigSchema = z.object({
  provider: z.enum(["saml", "oidc"]),
  // SAML fields
  entryPoint: z.string().url().optional(),
  issuer: z.string().optional(),
  cert: z.string().optional(),
  // OIDC fields
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  authorizationUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  userInfoUrl: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
});

/**
 * Check if user can perform action in workspace
 */
export function canPerformAction(
  userRole: WorkspaceRole,
  action: "view" | "edit" | "admin" | "owner",
): boolean {
  const permissions: Record<WorkspaceRole, string[]> = {
    owner: ["view", "edit", "admin", "owner"],
    admin: ["view", "edit", "admin"],
    member: ["view"],
  };

  return permissions[userRole]?.includes(action) || false;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: WorkspaceRole): string {
  const names: Record<WorkspaceRole, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: WorkspaceRole): string {
  const descriptions: Record<WorkspaceRole, string> = {
    owner: "Full control including billing and deletion",
    admin: "Can manage members and projects",
    member: "Can view and work on assigned projects",
  };
  return descriptions[role];
}

/**
 * Validate workspace slug
 */
export function isValidWorkspaceSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 1 && slug.length <= 50;
}

/**
 * Generate workspace slug from name
 */
export function generateWorkspaceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/**
 * SSO Provider configurations
 */
export const SSO_PROVIDERS = [
  {
    id: "saml",
    name: "SAML 2.0",
    description: "Enterprise SAML identity providers (Okta, Azure AD, etc.)",
    fields: [
      {
        key: "entryPoint",
        label: "SSO URL / Entry Point",
        type: "url",
        required: true,
      },
      {
        key: "issuer",
        label: "Issuer / Entity ID",
        type: "text",
        required: true,
      },
      {
        key: "cert",
        label: "X.509 Certificate",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "oidc",
    name: "OpenID Connect",
    description: "OIDC providers (Google Workspace, Auth0, etc.)",
    fields: [
      { key: "clientId", label: "Client ID", type: "text", required: true },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        required: true,
      },
      {
        key: "authorizationUrl",
        label: "Authorization URL",
        type: "url",
        required: true,
      },
      { key: "tokenUrl", label: "Token URL", type: "url", required: true },
      {
        key: "userInfoUrl",
        label: "User Info URL",
        type: "url",
        required: false,
      },
      {
        key: "scopes",
        label: "Scopes",
        type: "text",
        required: false,
        default: "openid,email,profile",
      },
    ],
  },
];

/**
 * Common SSO providers with presets
 */
export const COMMON_SSO_PROVIDERS = [
  {
    id: "okta",
    name: "Okta",
    type: "saml" as const,
    documentation:
      "https://developer.okta.com/docs/guides/saml-application-setup/overview/",
  },
  {
    id: "azure-ad",
    name: "Azure Active Directory",
    type: "saml" as const,
    documentation:
      "https://docs.microsoft.com/en-us/azure/active-directory/manage-apps/add-application-portal",
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    type: "oidc" as const,
    documentation: "https://support.google.com/a/answer/6087519",
  },
  {
    id: "auth0",
    name: "Auth0",
    type: "oidc" as const,
    documentation: "https://auth0.com/docs/get-started/applications",
  },
  {
    id: "onelogin",
    name: "OneLogin",
    type: "saml" as const,
    documentation: "https://developers.onelogin.com/saml",
  },
  {
    id: "jumpcloud",
    name: "JumpCloud",
    type: "saml" as const,
    documentation:
      "https://support.jumpcloud.com/support/s/article/sso-with-saml-2-0",
  },
];

/**
 * Generate SAML metadata XML
 */
export function generateSAMLMetadata(
  workspaceSlug: string,
  appUrl: string,
): string {
  const entityId = `${appUrl}/workspaces/${workspaceSlug}`;
  const acsUrl = `${appUrl}/api/auth/saml/callback`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

/**
 * Validate SSO configuration
 */
export function validateSSOConfig(config: SSOConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.provider === "saml") {
    if (!config.entryPoint) {
      errors.push("SAML Entry Point (SSO URL) is required");
    }
    if (!config.issuer) {
      errors.push("SAML Issuer (Entity ID) is required");
    }
    if (!config.cert) {
      errors.push("SAML Certificate is required");
    }
  } else if (config.provider === "oidc") {
    if (!config.clientId) {
      errors.push("OIDC Client ID is required");
    }
    if (!config.clientSecret) {
      errors.push("OIDC Client Secret is required");
    }
    if (!config.authorizationUrl) {
      errors.push("OIDC Authorization URL is required");
    }
    if (!config.tokenUrl) {
      errors.push("OIDC Token URL is required");
    }
  } else {
    errors.push("Invalid SSO provider");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Workspace limits by plan
 */
export const WORKSPACE_LIMITS = {
  free: {
    members: 3,
    projects: 5,
    envsPerProject: 3,
    sso: false,
    auditLogRetention: 7, // days
  },
  pro: {
    members: 20,
    projects: 20,
    envsPerProject: 10,
    sso: true,
    auditLogRetention: 90, // days
  },
  enterprise: {
    members: Infinity,
    projects: Infinity,
    envsPerProject: Infinity,
    sso: true,
    auditLogRetention: Infinity, // days
  },
};

/**
 * Check if workspace has reached member limit
 */
export function hasReachedMemberLimit(
  currentMembers: number,
  plan: "free" | "pro" | "enterprise",
): boolean {
  return currentMembers >= WORKSPACE_LIMITS[plan].members;
}

/**
 * Get remaining seats
 */
export function getRemainingSeats(
  currentMembers: number,
  plan: "free" | "pro" | "enterprise",
): number {
  const limit = WORKSPACE_LIMITS[plan].members;
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - currentMembers);
}
