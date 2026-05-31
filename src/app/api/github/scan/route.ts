import { auth } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  scanForSecrets,
  generateSecretReport,
} from "@/lib/github-secret-patterns";
import { z } from "zod";

const ScanBody = z.object({
  content: z.string(),
  filename: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }

  const parsed = ScanBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  try {
    const matches = scanForSecrets(parsed.data.content, parsed.data.filename);
    const report = generateSecretReport(matches);

    return jsonSuccess({
      scanned: true,
      filename: parsed.data.filename || "unnamed",
      ...report,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return jsonError(
      "SCAN_ERROR",
      error instanceof Error ? error.message : "Failed to scan content",
      500,
    );
  }
}

// GET endpoint to list available secret patterns
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const { SECRET_PATTERNS } = await import("@/lib/github-secret-patterns");

  return jsonSuccess({
    patterns: SECRET_PATTERNS.map((p) => ({
      name: p.name,
      severity: p.severity,
      description: p.description,
    })),
  });
}
