import { jsonVaultError, jsonVaultSuccess } from "@/lib/api-response";
import { VaultTokenSchema } from "@/lib/schemas";
import { getRedis, peekVault } from "@/lib/vault-store";

export const runtime = "edge";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsedToken = VaultTokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return jsonVaultError("NOT_FOUND", "Vault not found.", 404);
    }

    const redis = getRedis();
    const peek = await peekVault(redis, token);

    if (peek.status === "revoked") {
      return jsonVaultSuccess({
        state: "revoked" as const,
        expiresAt: null,
        oneTime: null,
      });
    }
    if (peek.status === "consumed") {
      return jsonVaultSuccess({
        state: "consumed" as const,
        expiresAt: null,
        oneTime: true,
      });
    }
    if (peek.status === "missing") {
      return jsonVaultSuccess({
        state: "missing" as const,
        expiresAt: null,
        oneTime: null,
      });
    }

    const { record } = peek;
    return jsonVaultSuccess({
      state: "active" as const,
      expiresAt: record.createdAt + record.ttl,
      oneTime: record.oneTime,
    });
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
