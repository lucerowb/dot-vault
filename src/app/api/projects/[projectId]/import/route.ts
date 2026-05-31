import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { encryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { logAuditEvent, createEnvVersion } from "@/lib/audit";
import {
  autoParseImport,
  validateSecretKey,
  sanitizeSecretValue,
  detectSecretIssues,
} from "@/lib/import-export";
import { nanoid } from "nanoid";

const MAX_IMPORT_SIZE = 2_000_000; // 2MB

const ImportBody = z.object({
  label: z.string().min(1).max(80),
  content: z.string().max(MAX_IMPORT_SIZE),
  format: z.enum([
    "auto",
    "env",
    "json",
    "1password",
    "hashicorp-vault",
    "aws-secrets-manager",
    "doppler",
    "vercel",
    "netlify",
  ] as const),
  options: z
    .object({
      skipInvalid: z.boolean().default(true),
      overwriteExisting: z.boolean().default(false),
      dryRun: z.boolean().default(false),
    })
    .default({
      skipInvalid: true,
      overwriteExisting: false,
      dryRun: false,
    }),
});

type Ctx = { params: Promise<{ projectId: string }> };

function getClientInfo(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const { projectId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "editor")) {
    return jsonError(
      "FORBIDDEN",
      "You need editor access to import env files.",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }

  const parsed = ImportBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const { label, content, format, options } = parsed.data;

  // Parse the import
  let parseResult;
  if (format === "auto") {
    const autoResult = autoParseImport(content);
    parseResult = autoResult.result;
  } else {
    // Use specific parser
    const { autoParseImport } = await import("@/lib/import-export");
    const autoResult = autoParseImport(content);
    parseResult = autoResult.result;
  }

  if (!parseResult.success) {
    return jsonError("PARSE_ERROR", parseResult.errors.join("; "), 400);
  }

  // Validate and sanitize secrets
  const validatedSecrets: Array<{ key: string; value: string }> = [];
  const validationErrors: string[] = [];

  for (const secret of parseResult.secrets) {
    const keyValidation = validateSecretKey(secret.key);
    if (!keyValidation.valid) {
      if (options.skipInvalid) {
        validationErrors.push(
          `Skipped "${secret.key}": ${keyValidation.error}`,
        );
        continue;
      } else {
        return jsonError(
          "VALIDATION_ERROR",
          `Invalid key "${secret.key}": ${keyValidation.error}`,
          400,
        );
      }
    }

    const sanitizedValue = sanitizeSecretValue(secret.value);
    validatedSecrets.push({
      key: secret.key,
      value: sanitizedValue,
    });
  }

  // Detect issues
  const issues = detectSecretIssues(validatedSecrets);

  // If dry run, return preview
  if (options.dryRun) {
    return jsonSuccess({
      dryRun: true,
      wouldImport: validatedSecrets.length,
      secrets: validatedSecrets.map((s) => ({
        key: s.key,
        valuePreview: s.value.slice(0, 20) + (s.value.length > 20 ? "..." : ""),
      })),
      issues,
      validationErrors,
      format: format === "auto" ? "detected" : format,
    });
  }

  // Check for existing env with same label
  const existing = await db
    .select({
      id: projectEnv.id,
      iv: projectEnv.iv,
      ciphertext: projectEnv.ciphertext,
    })
    .from(projectEnv)
    .where(
      and(eq(projectEnv.projectId, projectId), eq(projectEnv.label, label)),
    )
    .limit(1);

  const now = new Date();
  const envContent = validatedSecrets
    .map((s) => `${s.key}=${s.value}`)
    .join("\n");

  const { iv, ciphertext } = encryptBlob(envContent);
  const clientInfo = getClientInfo(request);

  if (existing.length > 0 && options.overwriteExisting) {
    const existingEnv = existing[0]!;
    // Create version before updating
    await createEnvVersion({
      projectEnvId: existingEnv.id,
      projectId,
      label,
      iv: existingEnv.iv,
      ciphertext: existingEnv.ciphertext,
      changeType: "updated",
      changedByUserId: session.user.id,
      comment: `Import from ${format === "auto" ? "auto-detected" : format} format`,
    });

    await db
      .update(projectEnv)
      .set({
        iv,
        ciphertext,
        updatedAt: now,
      })
      .where(eq(projectEnv.id, existingEnv.id));

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: "env_update",
      resourceType: "env",
      resourceId: existingEnv.id,
      metadata: {
        projectId,
        label,
        via: "import",
        format: format === "auto" ? "auto-detected" : format,
        importedCount: validatedSecrets.length,
      },
      ...clientInfo,
    });
  } else if (existing.length > 0) {
    return jsonError(
      "LABEL_EXISTS",
      `Environment "${label}" already exists. Use overwriteExisting: true to replace it.`,
      409,
    );
  } else {
    // Create new env
    const id = nanoid();
    await db.insert(projectEnv).values({
      id,
      projectId,
      label,
      iv,
      ciphertext,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial version
    await createEnvVersion({
      projectEnvId: id,
      projectId,
      label,
      iv,
      ciphertext,
      changeType: "created",
      changedByUserId: session.user.id,
      comment: `Import from ${format === "auto" ? "auto-detected" : format} format`,
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: "env_create",
      resourceType: "env",
      resourceId: id,
      metadata: {
        projectId,
        label,
        via: "import",
        format: format === "auto" ? "auto-detected" : format,
        importedCount: validatedSecrets.length,
      },
      ...clientInfo,
    });
  }

  return jsonSuccess({
    imported: validatedSecrets.length,
    label,
    issues,
    validationErrors,
    format: format === "auto" ? "detected" : format,
  });
}

// GET endpoint to list supported import formats
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  return jsonSuccess({
    formats: [
      {
        id: "auto",
        name: "Auto-detect",
        description: "Automatically detect the import format",
      },
      {
        id: "env",
        name: ".env File",
        description: "Standard .env file format (KEY=value)",
      },
      {
        id: "json",
        name: "JSON",
        description: "Generic JSON object format",
      },
      {
        id: "1password",
        name: "1Password",
        description: "1Password export format",
      },
      {
        id: "hashicorp-vault",
        name: "HashiCorp Vault",
        description: "Vault KV export format",
      },
      {
        id: "aws-secrets-manager",
        name: "AWS Secrets Manager",
        description: "AWS Secrets Manager JSON format",
      },
      {
        id: "doppler",
        name: "Doppler",
        description: "Doppler export format",
      },
      {
        id: "vercel",
        name: "Vercel",
        description: "Vercel environment variables export",
      },
      {
        id: "netlify",
        name: "Netlify",
        description: "Netlify environment variables export",
      },
    ],
  });
}
