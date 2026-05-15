import { CreateVaultSchema } from "@/lib/schemas";
import { generateDeleteToken, generateVaultToken } from "@/lib/tokens";
import { getClientIp } from "@/lib/ip";
import { limitUpload } from "@/lib/ratelimit";
import { getRedis, saveVault } from "@/lib/vault-store";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import type { VaultRecord } from "@/types/vault.types";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { success, remaining } = await limitUpload(ip);
    if (!success) {
      return jsonError(
        "RATE_LIMITED",
        "Too many uploads. Try again later.",
        429,
        remaining !== undefined
          ? { "X-RateLimit-Remaining": String(remaining) }
          : undefined
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("INVALID_JSON", "Request body must be JSON.", 400);
    }

    const parsed = CreateVaultSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
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

    return jsonSuccess(
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
      return jsonError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured. Set Upstash Redis environment variables.",
        503
      );
    }
    console.error(err);
    return jsonError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
