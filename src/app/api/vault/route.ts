import { jsonVaultError, jsonVaultSuccess } from "@/lib/api-response";
import { getClientIp } from "@/lib/ip";
import { limitUpload } from "@/lib/ratelimit";
import { CreateVaultSchema, MAX_VAULT_BODY_BYTES } from "@/lib/schemas";
import { generateDeleteToken, generateVaultToken } from "@/lib/tokens";
import { getRedis, saveVault } from "@/lib/vault-store";
import type { VaultRecord } from "@/types/vault.types";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { success, remaining } = await limitUpload(ip);
    if (!success) {
      return jsonVaultError(
        "RATE_LIMITED",
        "Too many uploads. Try again later.",
        429,
        remaining !== undefined
          ? { "X-RateLimit-Remaining": String(remaining) }
          : undefined
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_VAULT_BODY_BYTES) {
      return jsonVaultError(
        "PAYLOAD_TOO_LARGE",
        "Request body exceeds 2 MB.",
        413
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonVaultError("INVALID_JSON", "Request body must be JSON.", 400);
    }

    const parsed = CreateVaultSchema.safeParse(body);
    if (!parsed.success) {
      return jsonVaultError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(" "),
        400
      );
    }

    const redis = getRedis();
    const token = generateVaultToken();
    const deleteToken = generateDeleteToken();
    const createdAt = Math.floor(Date.now() / 1000);

    const record: VaultRecord = {
      iv: parsed.data.iv,
      ciphertext: parsed.data.ciphertext,
      createdAt,
      ttl: parsed.data.ttl,
      oneTime: parsed.data.oneTime,
      deleteToken,
    };

    await saveVault(redis, token, record);

    return jsonVaultSuccess(
      {
        token,
        expiresAt: createdAt + parsed.data.ttl,
        deleteToken,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonVaultError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured. Set Upstash Redis environment variables.",
        503
      );
    }
    console.error(err);
    return jsonVaultError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
