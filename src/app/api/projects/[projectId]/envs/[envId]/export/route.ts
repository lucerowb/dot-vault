import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { jsonError } from "@/lib/api-response";
import { decryptBlob } from "@/lib/at-rest-crypto";
import { auth } from "@/lib/auth";
import { db, projectEnv } from "@/lib/db";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { logAuditEvent } from "@/lib/audit";
import { exportSecrets, type ExportFormat } from "@/lib/import-export";

type Ctx = { params: Promise<{ projectId: string; envId: string }> };

const ExportQuery = z.object({
  format: z.enum(["env", "json", "csv", "yaml"] as const).default("env"),
  includeValues: z.enum(["true", "false"]).default("true"),
});

function getClientInfo(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const { projectId, envId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "viewer")) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  // Parse query params
  const url = new URL(request.url);
  const queryResult = ExportQuery.safeParse({
    format: url.searchParams.get("format") || "env",
    includeValues: url.searchParams.get("includeValues") || "true",
  });

  if (!queryResult.success) {
    return jsonError(
      "VALIDATION_ERROR",
      queryResult.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const { format, includeValues } = queryResult.data;

  // Get the environment
  const rows = await db
    .select()
    .from(projectEnv)
    .where(and(eq(projectEnv.id, envId), eq(projectEnv.projectId, projectId)))
    .limit(1);

  if (rows.length === 0) {
    return jsonError("NOT_FOUND", "Environment not found.", 404);
  }

  const env = rows[0]!;

  // Decrypt content
  let content: string;
  try {
    content = decryptBlob(env.iv, env.ciphertext);
  } catch {
    return jsonError("DECRYPT_FAILED", "Could not decrypt environment.", 500);
  }

  // Parse into secrets
  const secrets: Array<{ key: string; value: string }> = [];
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

    secrets.push({
      key,
      value: includeValues === "true" ? value : "***",
    });
  }

  // Export to requested format
  const exportResult = exportSecrets(secrets, format);

  if (!exportResult.success) {
    return jsonError("EXPORT_ERROR", "Failed to export environment.", 500);
  }

  // Log audit event
  const clientInfo = getClientInfo(request);
  await logAuditEvent({
    userId: session.user.id,
    action: "env_view",
    resourceType: "env",
    resourceId: envId,
    metadata: {
      projectId,
      label: env.label,
      via: "export",
      format,
      masked: includeValues !== "true",
    },
    ...clientInfo,
  });

  // Return as download
  const mimeTypes: Record<ExportFormat, string> = {
    env: "text/plain",
    json: "application/json",
    csv: "text/csv",
    yaml: "text/yaml",
  };

  return new Response(exportResult.content, {
    headers: {
      "Content-Type": mimeTypes[format],
      "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
    },
  });
}
