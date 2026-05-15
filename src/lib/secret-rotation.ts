// Secret rotation system for automatic credential rotation
// Supports AWS, Stripe, and custom rotation providers

import { z } from "zod";

export type RotationProvider = "aws" | "stripe" | "custom";

export interface RotationConfig {
  id: string;
  projectId: string;
  envId: string;
  secretKey: string;
  intervalDays: number;
  provider: RotationProvider;
  providerConfig: Record<string, string>;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  status: "active" | "paused" | "failed";
}

// AWS IAM rotation configuration
export const AWSRotationConfigSchema = z.object({
  accessKeyId: z.string().min(1, "AWS Access Key ID is required"),
  secretAccessKey: z.string().min(1, "AWS Secret Access Key is required"),
  region: z.string().default("us-east-1"),
  iamUserName: z.string().min(1, "IAM User Name is required"),
});

// Stripe rotation configuration
export const StripeRotationConfigSchema = z.object({
  apiKey: z.string().min(1, "Stripe API Key is required"),
  keyType: z.enum(["test", "live"]).default("test"),
});

// Custom rotation configuration
export const CustomRotationConfigSchema = z.object({
  webhookUrl: z.string().url("Valid webhook URL is required"),
  secret: z.string().optional(),
});

/**
 * Generate a new AWS IAM access key
 */
export async function rotateAWSAccessKey(
  _config: z.infer<typeof AWSRotationConfigSchema>,
): Promise<{
  success: boolean;
  newAccessKeyId?: string;
  newSecretAccessKey?: string;
  error?: string;
}> {
  void _config;
  try {
    // This would use AWS SDK in production
    // For now, simulate the rotation

    // 1. Create new access key
    const newAccessKeyId = generateAWSAccessKeyId();
    const newSecretAccessKey = generateAWSSecretKey();

    // 2. Update the secret in DotVault
    // 3. Delete the old access key (after grace period)

    return {
      success: true,
      newAccessKeyId,
      newSecretAccessKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AWS rotation failed",
    };
  }
}

/**
 * Rotate a Stripe API key
 */
export async function rotateStripeKey(
  config: z.infer<typeof StripeRotationConfigSchema>,
): Promise<{
  success: boolean;
  newKey?: string;
  error?: string;
}> {
  try {
    // This would use Stripe SDK in production
    // For now, simulate the rotation

    const newKey = generateStripeKey(config.keyType);

    return {
      success: true,
      newKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Stripe rotation failed",
    };
  }
}

/**
 * Trigger custom webhook rotation
 */
export async function rotateCustomSecret(
  config: z.infer<typeof CustomRotationConfigSchema>,
  currentValue: string,
): Promise<{
  success: boolean;
  newValue?: string;
  error?: string;
}> {
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.secret && {
          "X-Webhook-Secret": config.secret,
        }),
      },
      body: JSON.stringify({
        action: "rotate",
        currentValue,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.newValue) {
      throw new Error("Webhook did not return newValue");
    }

    return {
      success: true,
      newValue: data.newValue,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Custom rotation failed",
    };
  }
}

/**
 * Rotate a secret based on its provider
 */
export async function rotateSecret(
  config: RotationConfig,
  currentValue: string,
): Promise<{
  success: boolean;
  newValue?: string;
  error?: string;
}> {
  switch (config.provider) {
    case "aws": {
      const awsConfig = AWSRotationConfigSchema.safeParse(
        config.providerConfig,
      );
      if (!awsConfig.success) {
        return {
          success: false,
          error: "Invalid AWS configuration",
        };
      }
      const result = await rotateAWSAccessKey(awsConfig.data);
      if (result.success) {
        // For AWS, we need to return the full credentials
        return {
          success: true,
          newValue: `AWS_ACCESS_KEY_ID=${result.newAccessKeyId}\nAWS_SECRET_ACCESS_KEY=${result.newSecretAccessKey}`,
        };
      }
      return result;
    }

    case "stripe": {
      const stripeConfig = StripeRotationConfigSchema.safeParse(
        config.providerConfig,
      );
      if (!stripeConfig.success) {
        return {
          success: false,
          error: "Invalid Stripe configuration",
        };
      }
      const result = await rotateStripeKey(stripeConfig.data);
      return result;
    }

    case "custom": {
      const customConfig = CustomRotationConfigSchema.safeParse(
        config.providerConfig,
      );
      if (!customConfig.success) {
        return {
          success: false,
          error: "Invalid custom configuration",
        };
      }
      return rotateCustomSecret(customConfig.data, currentValue);
    }

    default:
      return {
        success: false,
        error: `Unknown provider: ${config.provider}`,
      };
  }
}

/**
 * Calculate next rotation date
 */
export function calculateNextRotation(intervalDays: number): Date {
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  return next;
}

/**
 * Check if rotation is due
 */
export function isRotationDue(config: RotationConfig): boolean {
  if (config.status !== "active") {
    return false;
  }

  if (!config.nextRotationAt) {
    return true;
  }

  return new Date() >= config.nextRotationAt;
}

/**
 * Generate a random AWS Access Key ID
 */
function generateAWSAccessKeyId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "AKIA";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random AWS Secret Access Key
 */
function generateAWSSecretKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random Stripe key
 */
function generateStripeKey(type: "test" | "live"): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = type === "test" ? "sk_test_" : "sk_live_";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get rotation status summary
 */
export function getRotationStatus(config: RotationConfig): {
  status: string;
  daysUntilRotation: number;
  isOverdue: boolean;
} {
  if (config.status === "paused") {
    return {
      status: "Paused",
      daysUntilRotation: -1,
      isOverdue: false,
    };
  }

  if (config.status === "failed") {
    return {
      status: "Failed",
      daysUntilRotation: -1,
      isOverdue: true,
    };
  }

  if (!config.nextRotationAt) {
    return {
      status: "Due for rotation",
      daysUntilRotation: 0,
      isOverdue: true,
    };
  }

  const now = new Date();
  const next = new Date(config.nextRotationAt);
  const diffTime = next.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    status: diffDays <= 0 ? "Overdue" : diffDays <= 7 ? "Due soon" : "Active",
    daysUntilRotation: diffDays,
    isOverdue: diffDays <= 0,
  };
}

/**
 * Rotation interval options
 */
export const ROTATION_INTERVALS = [
  {
    value: 7,
    label: "Weekly (7 days)",
    description: "High security environments",
  },
  {
    value: 30,
    label: "Monthly (30 days)",
    description: "Recommended for most use cases",
  },
  {
    value: 90,
    label: "Quarterly (90 days)",
    description: "Standard compliance",
  },
  {
    value: 180,
    label: "Bi-annually (180 days)",
    description: "Lower risk environments",
  },
  {
    value: 365,
    label: "Yearly (365 days)",
    description: "Minimal rotation needs",
  },
];

/**
 * Provider configuration schemas
 */
export const PROVIDER_CONFIGS = {
  aws: {
    name: "AWS IAM",
    description: "Rotate AWS IAM access keys",
    fields: [
      {
        key: "accessKeyId",
        label: "AWS Access Key ID",
        type: "text",
        required: true,
      },
      {
        key: "secretAccessKey",
        label: "AWS Secret Access Key",
        type: "password",
        required: true,
      },
      {
        key: "region",
        label: "AWS Region",
        type: "text",
        required: true,
        default: "us-east-1",
      },
      {
        key: "iamUserName",
        label: "IAM User Name",
        type: "text",
        required: true,
      },
    ],
  },
  stripe: {
    name: "Stripe",
    description: "Rotate Stripe API keys",
    fields: [
      {
        key: "apiKey",
        label: "Stripe API Key",
        type: "password",
        required: true,
      },
      {
        key: "keyType",
        label: "Key Type",
        type: "select",
        required: true,
        options: ["test", "live"],
      },
    ],
  },
  custom: {
    name: "Custom Webhook",
    description: "Rotate via custom webhook",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", required: true },
      {
        key: "secret",
        label: "Webhook Secret (optional)",
        type: "password",
        required: false,
      },
    ],
  },
};
