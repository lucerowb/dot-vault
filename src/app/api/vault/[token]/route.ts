import {
  jsonVaultError,
  jsonVaultSuccess,
  vaultResponseInit,
} from "@/lib/api-response";
import { timingSafeEqualString } from "@/lib/equals";
import { getClientIp } from "@/lib/ip";
import { limitDownload } from "@/lib/ratelimit";
import { vaultRateLimitedResponse } from "@/lib/vault-rate-limit-response";
import { VaultTokenSchema } from "@/lib/schemas";
import type { VaultRecord } from "@/types/vault.types";
import {
  buildVaultAccessEvent,
  recordVaultAccess,
} from "@/lib/vault-access";
import {
  deleteVaultKeys,
  fetchVaultAtomic,
  getRedis,
  peekVault,
  readSenderDeleteToken,
  readVaultForDelete,
} from "@/lib/vault-store";

export const runtime = "edge";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsedToken = VaultTokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return jsonVaultError("NOT_FOUND", "Vault not found.", 404);
    }

    const ip = getClientIp(request);
    const downloadLimit = await limitDownload(ip);
    if (!downloadLimit.success) {
      return vaultRateLimitedResponse("download", downloadLimit);
    }

    const redis = getRedis();
    const peek = await peekVault(redis, token);

    if (peek.status === "revoked") {
      return jsonVaultError(
        "GONE",
        "This link was revoked by the sender.",
        410,
      );
    }
    if (peek.status === "consumed") {
      return jsonVaultError(
        "GONE",
        "This one-time vault was already retrieved.",
        410,
      );
    }
    if (peek.status === "missing") {
      return jsonVaultError("NOT_FOUND", "Vault not found or expired.", 404);
    }

    if (peek.record.oneTime) {
      return jsonVaultError(
        "METHOD_NOT_ALLOWED",
        "One-time links must be opened from the receive page in your browser (POST).",
        405,
      );
    }

    const result = await fetchVaultAtomic(redis, token);
    return await vaultOpenResponse(
      request,
      redis,
      token,
      result,
      downloadLimit.remaining,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonVaultError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503,
      );
    }
    console.error(err);
    return jsonVaultError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsedToken = VaultTokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return jsonVaultError("NOT_FOUND", "Vault not found.", 404);
    }

    const ip = getClientIp(request);
    const downloadLimit = await limitDownload(ip);
    if (!downloadLimit.success) {
      return vaultRateLimitedResponse("download", downloadLimit);
    }

    const redis = getRedis();
    const result = await fetchVaultAtomic(redis, token);
    return await vaultOpenResponse(
      request,
      redis,
      token,
      result,
      downloadLimit.remaining,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonVaultError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503,
      );
    }
    console.error(err);
    return jsonVaultError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}

async function vaultOpenResponse(
  request: Request,
  redis: ReturnType<typeof getRedis>,
  token: string,
  result:
    | { status: 200; record: VaultRecord }
    | { status: 404 }
    | { status: 410 },
  remaining: number | undefined,
) {
  if (result.status === 404) {
    const peek = await peekVault(redis, token);
    if (peek.status === "revoked") {
      return jsonVaultError(
        "GONE",
        "This link was revoked by the sender.",
        410,
      );
    }
    return jsonVaultError("NOT_FOUND", "Vault not found or expired.", 404);
  }
  if (result.status === 410) {
    return jsonVaultError(
      "GONE",
      "This one-time link was already opened. Ask the sender for a new link.",
      410,
    );
  }

  const { record } = result;
  const { iv, ciphertext, ttl, oneTime, createdAt } = record;

  void recordVaultAccess(
    redis,
    token,
    record,
    buildVaultAccessEvent(request),
  ).catch((err) => console.error("vault access log failed", err));

  return jsonVaultSuccess(
    {
      iv,
      ciphertext,
      expiresAt: createdAt + ttl,
      oneTime,
    },
    remaining !== undefined
      ? { headers: { "X-RateLimit-Remaining": String(remaining) } }
      : undefined,
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsedToken = VaultTokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return jsonVaultError("NOT_FOUND", "Vault not found.", 404);
    }

    const deleteHeader = request.headers.get("x-delete-token")?.trim();
    if (!deleteHeader) {
      return jsonVaultError(
        "DELETE_TOKEN_REQUIRED",
        "Missing X-Delete-Token header.",
        401,
      );
    }

    const redis = getRedis();
    const record = await readVaultForDelete(redis, token);
    const senderDeleteToken = await readSenderDeleteToken(redis, token);
    const expectedDeleteToken = record?.deleteToken ?? senderDeleteToken;

    if (!expectedDeleteToken) {
      return jsonVaultError("NOT_FOUND", "Vault not found or expired.", 404);
    }

    if (!timingSafeEqualString(deleteHeader, expectedDeleteToken)) {
      return jsonVaultError("FORBIDDEN", "Invalid delete token.", 403);
    }

    await deleteVaultKeys(redis, token, { preserveAccessLog: true });
    return new Response(null, vaultResponseInit({ status: 204 }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonVaultError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503,
      );
    }
    console.error(err);
    return jsonVaultError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
