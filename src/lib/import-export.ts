// Import/Export functionality for DotVault
// Supports 1Password, HashiCorp Vault, AWS Secrets Manager, and .env files

import { z } from "zod";

// Supported import formats
export type ImportFormat =
  | "env"
  | "json"
  | "1password"
  | "hashicorp-vault"
  | "aws-secrets-manager"
  | "doppler"
  | "vercel"
  | "netlify";

// Export formats
export type ExportFormat = "env" | "json" | "csv" | "yaml";

// Import result
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  secrets: Array<{
    key: string;
    value: string;
    category?: string;
  }>;
}

// Export result
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  content: string;
  filename: string;
}

// 1Password export format
const OnePasswordSchema = z.array(
  z.object({
    title: z.string(),
    fields: z.array(
      z.object({
        label: z.string(),
        value: z.string().optional(),
        type: z.string(),
      }),
    ),
    urls: z.array(z.object({ url: z.string() })).optional(),
    tags: z.array(z.string()).optional(),
  }),
);

// HashiCorp Vault format
const VaultSchema = z.object({
  data: z.record(z.string(), z.string()),
});

// AWS Secrets Manager format
const AWSSecretsSchema = z.object({
  SecretString: z.string().optional(),
  SecretBinary: z.string().optional(),
});

// Doppler format
const DopplerSchema = z.object({
  name: z.string(),
  value: z.string(),
});

// Vercel format
const VercelSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
    target: z.array(z.string()).optional(),
    type: z.string().optional(),
  }),
);

// Netlify format
const NetlifySchema = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
  }),
);

/**
 * Parse .env file content
 */
export function parseEnvFile(content: string): ImportResult {
  const secrets: Array<{ key: string; value: string }> = [];
  const errors: string[] = [];

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle multi-line values
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
      let value = trimmed;
      let j = i + 1;

      // Find closing quote
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine === undefined) break;
        value += "\n" + nextLine;
        const quote = trimmed[0];
        if (
          quote &&
          nextLine.trim().endsWith(quote) &&
          !nextLine.trim().endsWith("\\" + quote)
        ) {
          break;
        }
        j++;
      }

      i = j;

      const equalIndex = value.indexOf("=");
      if (equalIndex === -1) {
        errors.push(`Line ${i + 1}: Invalid format`);
        continue;
      }

      const key = value.slice(0, equalIndex).trim();
      let val = value.slice(equalIndex + 1).trim();

      // Remove surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      secrets.push({ key, value: val });
    } else {
      // Single line value
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex === -1) {
        errors.push(`Line ${i + 1}: Invalid format`);
        continue;
      }

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      secrets.push({ key, value });
    }
  }

  return {
    success: true,
    imported: secrets.length,
    skipped: 0,
    errors,
    secrets,
  };
}

/**
 * Parse 1Password export
 */
export function parse1PasswordExport(content: string): ImportResult {
  try {
    const data = JSON.parse(content);
    const parsed = OnePasswordSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Invalid 1Password format"],
        secrets: [],
      };
    }

    const secrets: Array<{ key: string; value: string; category?: string }> =
      [];
    const errors: string[] = [];

    for (const item of parsed.data) {
      const category = item.tags?.[0] || "general";

      for (const field of item.fields) {
        if (field.value && field.type !== "reference") {
          secrets.push({
            key: field.label,
            value: field.value,
            category,
          });
        }
      }
    }

    return {
      success: true,
      imported: secrets.length,
      skipped: 0,
      errors,
      secrets,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        error instanceof Error
          ? error.message
          : "Failed to parse 1Password export",
      ],
      secrets: [],
    };
  }
}

/**
 * Parse HashiCorp Vault export
 */
export function parseVaultExport(content: string): ImportResult {
  try {
    const data = JSON.parse(content);
    const parsed = VaultSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Invalid Vault format"],
        secrets: [],
      };
    }

    const secrets = Object.entries(parsed.data.data).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    return {
      success: true,
      imported: secrets.length,
      skipped: 0,
      errors: [],
      secrets,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        error instanceof Error ? error.message : "Failed to parse Vault export",
      ],
      secrets: [],
    };
  }
}

/**
 * Parse AWS Secrets Manager export
 */
export function parseAWSSecretsExport(content: string): ImportResult {
  try {
    const data = JSON.parse(content);
    const parsed = AWSSecretsSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Invalid AWS Secrets Manager format"],
        secrets: [],
      };
    }

    let secrets: Array<{ key: string; value: string }> = [];

    if (parsed.data.SecretString) {
      try {
        const secretData = JSON.parse(parsed.data.SecretString);
        secrets = Object.entries(secretData).map(([key, value]) => ({
          key,
          value: String(value),
        }));
      } catch {
        // If not JSON, treat as single secret
        secrets = [{ key: "secret", value: parsed.data.SecretString }];
      }
    }

    return {
      success: true,
      imported: secrets.length,
      skipped: 0,
      errors: [],
      secrets,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        error instanceof Error
          ? error.message
          : "Failed to parse AWS Secrets export",
      ],
      secrets: [],
    };
  }
}

/**
 * Parse Doppler export
 */
export function parseDopplerExport(content: string): ImportResult {
  try {
    const data = JSON.parse(content);

    // Doppler can export as array or object
    let secrets: Array<{ key: string; value: string }> = [];

    if (Array.isArray(data)) {
      const parsed = z.array(DopplerSchema).safeParse(data);
      if (parsed.success) {
        secrets = parsed.data.map((item) => ({
          key: item.name,
          value: item.value,
        }));
      }
    } else {
      // Object format
      secrets = Object.entries(data).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    return {
      success: true,
      imported: secrets.length,
      skipped: 0,
      errors: [],
      secrets,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        error instanceof Error
          ? error.message
          : "Failed to parse Doppler export",
      ],
      secrets: [],
    };
  }
}

/**
 * Parse Vercel export
 */
export function parseVercelExport(content: string): ImportResult {
  try {
    const data = JSON.parse(content);
    const parsed = VercelSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Invalid Vercel format"],
        secrets: [],
      };
    }

    const secrets = parsed.data.map((item) => ({
      key: item.key,
      value: item.value,
    }));

    return {
      success: true,
      imported: secrets.length,
      skipped: 0,
      errors: [],
      secrets,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        error instanceof Error
          ? error.message
          : "Failed to parse Vercel export",
      ],
      secrets: [],
    };
  }
}

/**
 * Parse Netlify export
 */
export function parseNetlifyExport(content: string): ImportResult {
  try {
    const data = JSON.parse(content);
    const parsed = NetlifySchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Invalid Netlify format"],
        secrets: [],
      };
    }

    const secrets = parsed.data.map((item) => ({
      key: item.key,
      value: item.value,
    }));

    return {
      success: true,
      imported: secrets.length,
      skipped: 0,
      errors: [],
      secrets,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        error instanceof Error
          ? error.message
          : "Failed to parse Netlify export",
      ],
      secrets: [],
    };
  }
}

/**
 * Auto-detect and parse import format
 */
export function autoParseImport(content: string): {
  format: ImportFormat;
  result: ImportResult;
} {
  // Try JSON formats first
  if (content.trim().startsWith("[") || content.trim().startsWith("{")) {
    try {
      const data = JSON.parse(content);

      // Check for 1Password format
      if (Array.isArray(data) && data[0]?.fields) {
        return { format: "1password", result: parse1PasswordExport(content) };
      }

      // Check for Vault format
      if (data.data && typeof data.data === "object") {
        return { format: "hashicorp-vault", result: parseVaultExport(content) };
      }

      // Check for AWS Secrets Manager format
      if (data.SecretString || data.SecretBinary) {
        return {
          format: "aws-secrets-manager",
          result: parseAWSSecretsExport(content),
        };
      }

      // Check for Vercel format
      if (Array.isArray(data) && data[0]?.key && data[0]?.target) {
        return { format: "vercel", result: parseVercelExport(content) };
      }

      // Check for Netlify format
      if (Array.isArray(data) && data[0]?.key && !data[0]?.target) {
        return { format: "netlify", result: parseNetlifyExport(content) };
      }

      // Check for Doppler format
      if (Array.isArray(data) && data[0]?.name) {
        return { format: "doppler", result: parseDopplerExport(content) };
      }

      // Generic JSON
      const secrets = Object.entries(data).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      return {
        format: "json",
        result: {
          success: true,
          imported: secrets.length,
          skipped: 0,
          errors: [],
          secrets,
        },
      };
    } catch {
      // Not valid JSON, fall through to env format
    }
  }

  // Default to env format
  return { format: "env", result: parseEnvFile(content) };
}

/**
 * Export secrets to .env format
 */
export function exportToEnv(
  secrets: Array<{ key: string; value: string }>,
): ExportResult {
  const lines = secrets.map(({ key, value }) => {
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

  return {
    success: true,
    format: "env",
    content: lines.join("\n"),
    filename: ".env",
  };
}

/**
 * Export secrets to JSON format
 */
export function exportToJSON(
  secrets: Array<{ key: string; value: string }>,
): ExportResult {
  const obj = Object.fromEntries(secrets.map((s) => [s.key, s.value]));

  return {
    success: true,
    format: "json",
    content: JSON.stringify(obj, null, 2),
    filename: "secrets.json",
  };
}

/**
 * Export secrets to CSV format
 */
export function exportToCSV(
  secrets: Array<{ key: string; value: string }>,
): ExportResult {
  const header = "Key,Value\n";
  const rows = secrets
    .map(({ key, value }) => {
      // Escape CSV special characters
      const escapedKey = key.replace(/"/g, '""');
      const escapedValue = value.replace(/"/g, '""');
      return `"${escapedKey}","${escapedValue}"`;
    })
    .join("\n");

  return {
    success: true,
    format: "csv",
    content: header + rows,
    filename: "secrets.csv",
  };
}

/**
 * Export secrets to YAML format
 */
export function exportToYAML(
  secrets: Array<{ key: string; value: string }>,
): ExportResult {
  const lines = secrets.map(({ key, value }) => {
    // Escape special YAML characters
    const escapedValue = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

    return `${key}: "${escapedValue}"`;
  });

  return {
    success: true,
    format: "yaml",
    content: lines.join("\n"),
    filename: "secrets.yaml",
  };
}

/**
 * Export secrets to specified format
 */
export function exportSecrets(
  secrets: Array<{ key: string; value: string }>,
  format: ExportFormat,
): ExportResult {
  switch (format) {
    case "env":
      return exportToEnv(secrets);
    case "json":
      return exportToJSON(secrets);
    case "csv":
      return exportToCSV(secrets);
    case "yaml":
      return exportToYAML(secrets);
    default:
      return exportToEnv(secrets);
  }
}

/**
 * Validate secret key format
 */
export function validateSecretKey(key: string): {
  valid: boolean;
  error?: string;
} {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: "Key cannot be empty" };
  }

  if (key.length > 256) {
    return { valid: false, error: "Key too long (max 256 characters)" };
  }

  // Allow alphanumeric, underscore, and common env var characters
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return {
      valid: false,
      error:
        "Key must start with letter or underscore and contain only letters, numbers, and underscores",
    };
  }

  return { valid: true };
}

/**
 * Sanitize secret value
 */
export function sanitizeSecretValue(value: string): string {
  // Remove null bytes
  let sanitized = value.replace(/\x00/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }

  return sanitized;
}

/**
 * Detect potential issues in secrets
 */
export function detectSecretIssues(
  secrets: Array<{ key: string; value: string }>,
): Array<{
  key: string;
  issue: string;
  severity: "warning" | "error";
}> {
  const issues: Array<{
    key: string;
    issue: string;
    severity: "warning" | "error";
  }> = [];

  const seenKeys = new Set<string>();

  for (const { key, value } of secrets) {
    // Check for duplicates
    if (seenKeys.has(key)) {
      issues.push({
        key,
        issue: "Duplicate key",
        severity: "error",
      });
    }
    seenKeys.add(key);

    // Check for empty values
    if (!value || value.trim().length === 0) {
      issues.push({
        key,
        issue: "Empty value",
        severity: "warning",
      });
    }

    // Check for common placeholder values
    const placeholders = [
      "placeholder",
      "example",
      "test",
      "dummy",
      "changeme",
      "your_",
      "xxx",
      "***",
    ];
    const lowerValue = value.toLowerCase();
    for (const placeholder of placeholders) {
      if (lowerValue.includes(placeholder)) {
        issues.push({
          key,
          issue: `Value appears to be a placeholder (contains "${placeholder}")`,
          severity: "warning",
        });
        break;
      }
    }

    // Check for suspicious patterns
    if (value.includes("localhost") || value.includes("127.0.0.1")) {
      issues.push({
        key,
        issue: "Value contains localhost reference",
        severity: "warning",
      });
    }

    // Check for very long values (might be encoded data)
    if (value.length > 5000) {
      issues.push({
        key,
        issue: "Value is unusually long",
        severity: "warning",
      });
    }
  }

  return issues;
}
