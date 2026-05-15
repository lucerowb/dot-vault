// API Key management for programmatic access
import { z } from "zod";
import { createHash, randomBytes } from "crypto";

export type ApiKeyScope =
  | "read:envs"
  | "write:envs"
  | "read:projects"
  | "write:projects"
  | "admin";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isRevoked: boolean;
}

// Validation schemas
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z
    .array(
      z.enum([
        "read:envs",
        "write:envs",
        "read:projects",
        "write:projects",
        "admin",
      ] as const),
    )
    .min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const ApiKeyIdSchema = z.string().min(1);

/**
 * Generate a new API key
 * Returns the full key (shown only once) and the hashed version for storage
 */
export function generateApiKey(): {
  fullKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  // Generate random key: dv_live_ + 48 random characters
  const randomPart = randomBytes(36).toString("base64url").slice(0, 48);
  const fullKey = `dv_live_${randomPart}`;

  // Create prefix for identification (first 12 chars after prefix)
  const keyPrefix = randomPart.slice(0, 12);

  // Hash for storage
  const keyHash = createHash("sha256").update(fullKey).digest("hex");

  return { fullKey, keyHash, keyPrefix };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith("dv_live_") && key.length === 56;
}

/**
 * Extract key prefix from full key
 */
export function extractKeyPrefix(key: string): string {
  if (!key.startsWith("dv_live_")) {
    return "";
  }
  return key.slice(8, 20); // Extract 12 chars after prefix
}

/**
 * Check if API key has required scope
 */
export function hasScope(
  keyScopes: ApiKeyScope[],
  requiredScope: ApiKeyScope,
): boolean {
  // Admin scope grants all permissions
  if (keyScopes.includes("admin")) {
    return true;
  }

  // Check for exact scope match
  if (keyScopes.includes(requiredScope)) {
    return true;
  }

  // Check for broader permissions
  const scopeHierarchy: Record<ApiKeyScope, ApiKeyScope[]> = {
    "read:envs": ["write:envs"],
    "write:envs": [],
    "read:projects": ["write:projects"],
    "write:projects": [],
    admin: [],
  };

  // Check if any granted scope implies the required scope
  for (const scope of keyScopes) {
    if (scopeHierarchy[scope]?.includes(requiredScope)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if API key has all required scopes
 */
export function hasAllScopes(
  keyScopes: ApiKeyScope[],
  requiredScopes: ApiKeyScope[],
): boolean {
  return requiredScopes.every((scope) => hasScope(keyScopes, scope));
}

/**
 * Get scope description
 */
export function getScopeDescription(scope: ApiKeyScope): string {
  const descriptions: Record<ApiKeyScope, string> = {
    "read:envs": "Read environment variables",
    "write:envs": "Create and update environment variables",
    "read:projects": "Read project information",
    "write:projects": "Create and modify projects",
    admin: "Full administrative access",
  };

  return descriptions[scope];
}

/**
 * Get all available scopes
 */
export function getAllScopes(): Array<{
  id: ApiKeyScope;
  name: string;
  description: string;
  category: "read" | "write" | "admin";
}> {
  return [
    {
      id: "read:envs",
      name: "Read Environments",
      description: "View environment variables",
      category: "read",
    },
    {
      id: "write:envs",
      name: "Write Environments",
      description: "Create and update environment variables",
      category: "write",
    },
    {
      id: "read:projects",
      name: "Read Projects",
      description: "View project information",
      category: "read",
    },
    {
      id: "write:projects",
      name: "Write Projects",
      description: "Create and modify projects",
      category: "write",
    },
    {
      id: "admin",
      name: "Admin",
      description: "Full administrative access",
      category: "admin",
    },
  ];
}

/**
 * Calculate API key expiration date
 */
export function calculateExpiration(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Check if API key is expired
 */
export function isExpired(key: ApiKey): boolean {
  if (!key.expiresAt) {
    return false;
  }
  return new Date() > key.expiresAt;
}

/**
 * Format API key for display (masked)
 */
export function formatApiKey(key: ApiKey): string {
  return `dv_live_${key.keyPrefix}****`;
}

/**
 * Get API key status
 */
export function getKeyStatus(key: ApiKey): {
  status: "active" | "expired" | "revoked";
  message: string;
} {
  if (key.isRevoked) {
    return { status: "revoked", message: "Revoked" };
  }

  if (isExpired(key)) {
    return { status: "expired", message: "Expired" };
  }

  return { status: "active", message: "Active" };
}

/**
 * Common API key use cases
 */
export const API_KEY_USE_CASES = [
  {
    name: "CI/CD Deployment",
    description: "For automated deployments in CI/CD pipelines",
    scopes: ["read:envs"],
    expiresInDays: 365,
  },
  {
    name: "Development Tools",
    description: "For local development and testing",
    scopes: ["read:envs", "write:envs"],
    expiresInDays: 90,
  },
  {
    name: "Production Services",
    description: "For production application servers",
    scopes: ["read:envs"],
    expiresInDays: 180,
  },
  {
    name: "Automation Scripts",
    description: "For infrastructure automation",
    scopes: ["read:envs", "write:envs", "read:projects"],
    expiresInDays: 90,
  },
  {
    name: "Full Access",
    description: "For administrative tasks",
    scopes: ["admin"],
    expiresInDays: 30,
  },
];

/**
 * API rate limits by scope
 */
export const API_RATE_LIMITS: Record<
  ApiKeyScope,
  { requests: number; window: string }
> = {
  "read:envs": { requests: 1000, window: "1 minute" },
  "write:envs": { requests: 100, window: "1 minute" },
  "read:projects": { requests: 500, window: "1 minute" },
  "write:projects": { requests: 50, window: "1 minute" },
  admin: { requests: 2000, window: "1 minute" },
};
