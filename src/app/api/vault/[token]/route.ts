import { VaultTokenSchema } from "@/lib/schemas";
import { timingSafeEqualString } from "@/lib/equals";
import { getClientIp } from "@/lib/ip";
import { limitDownload } from "@/lib/ratelimit";
import {
  deleteVaultKeys,
  fetchVaultAtomic,
  getRedis,
  readVaultForDelete,
} from "@/lib/vault-store";
import { jsonError, jsonSuccess } from "@/lib/api-response";

export const runtime = "edge";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsedToken = VaultTokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return jsonError("NOT_FOUND", "Vault not found.", 404);
    }

    const ip = getClientIp(request);
    const { success, remaining } = await limitDownload(ip);
    if (!success) {
      return jsonError(
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
      return jsonError("NOT_FOUND", "Vault not found or expired.", 404);
    }
    if (result.status === 410) {
      return jsonError(
        "GONE",
        "This one-time vault was already retrieved.",
        410
      );
    }

    const { record } = result;
    const { iv, ciphertext, ttl, oneTime, createdAt } = record;

    return jsonSuccess(
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
      return jsonError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503
      );
    }
    console.error(err);
    return jsonError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsedToken = VaultTokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return jsonError("NOT_FOUND", "Vault not found.", 404);
    }

    const deleteHeader = request.headers.get("x-delete-token")?.trim();
    if (!deleteHeader) {
      return jsonError(
        "DELETE_TOKEN_REQUIRED",
        "Missing X-Delete-Token header.",
        401
      );
    }

    const redis = getRedis();
    const record = await readVaultForDelete(redis, token);
    if (!record) {
      return jsonError("NOT_FOUND", "Vault not found or expired.", 404);
    }

    if (!timingSafeEqualString(deleteHeader, record.deleteToken)) {
      return jsonError("FORBIDDEN", "Invalid delete token.", 403);
    }

    await deleteVaultKeys(redis, token);
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.includes("UPSTASH_REDIS")) {
      return jsonError(
        "SERVICE_UNAVAILABLE",
        "Vault storage is not configured.",
        503
      );
    }
    console.error(err);
    return jsonError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
