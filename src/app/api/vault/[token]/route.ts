import {
  jsonVaultError,
  jsonVaultSuccess,
  vaultResponseInit,
} from "@/lib/api-response";
import { timingSafeEqualString } from "@/lib/equals";
import { getClientIp } from "@/lib/ip";
import { limitDownload } from "@/lib/ratelimit";
import { VaultTokenSchema } from "@/lib/schemas";
import {
  deleteVaultKeys,
  fetchVaultAtomic,
  getRedis,
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
    const { success, remaining } = await limitDownload(ip);
    if (!success) {
      return jsonVaultError(
        "RATE_LIMITED",
        "Too many downloads. Try again later.",
        429,
        remaining !== undefined
          ? { "X-RateLimit-Remaining": String(remaining) }
          : undefined
      );
    }

    const redis = getRedis();
    const result = await fetchVaultAtomic(redis, token);

    if (result.status === 404) {
      return jsonVaultError("NOT_FOUND", "Vault not found or expired.", 404);
    }
    if (result.status === 410) {
      return jsonVaultError(
        "GONE",
        "This one-time vault was already retrieved.",
        410
      );
    }

    const { record } = result;
    const { iv, ciphertext, ttl, oneTime, createdAt } = record;

    return jsonVaultSuccess(
      {
        iv,
        ciphertext,
        expiresAt: createdAt + ttl,
        oneTime,
      },
      remaining !== undefined
        ? { headers: { "X-RateLimit-Remaining": String(remaining) } }
        : undefined
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonVaultError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503
      );
    }
    console.error(err);
    return jsonVaultError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
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
        401
      );
    }

    const redis = getRedis();
    const record = await readVaultForDelete(redis, token);
    if (!record) {
      return jsonVaultError("NOT_FOUND", "Vault not found or expired.", 404);
    }

    if (!timingSafeEqualString(deleteHeader, record.deleteToken)) {
      return jsonVaultError("FORBIDDEN", "Invalid delete token.", 403);
    }

    await deleteVaultKeys(redis, token);
    return new Response(null, vaultResponseInit({ status: 204 }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonVaultError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503
      );
    }
    console.error(err);
    return jsonVaultError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
