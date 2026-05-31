import { jsonVaultError, jsonVaultSuccess } from "@/lib/api-response";
import { timingSafeEqualString } from "@/lib/equals";
import { VaultTokenSchema } from "@/lib/schemas";
import {
  getVaultAccessLog,
  summarizeAccessLog,
} from "@/lib/vault-access";
import {
  getRedis,
  peekVault,
  readSenderDeleteToken,
  readVaultForDelete,
} from "@/lib/vault-store";
import type { VaultInsightsData } from "@/types/vault.types";

export const runtime = "edge";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
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
    const senderToken =
      record?.deleteToken ?? (await readSenderDeleteToken(redis, token));

    if (!senderToken) {
      return jsonVaultError("NOT_FOUND", "Vault not found or expired.", 404);
    }

    if (!timingSafeEqualString(deleteHeader, senderToken)) {
      return jsonVaultError("FORBIDDEN", "Invalid delete token.", 403);
    }

    const peek = await peekVault(redis, token);
    const accesses = await getVaultAccessLog(redis, token);
    const summary = summarizeAccessLog(accesses);

    let state: VaultInsightsData["state"] = "missing";
    let expiresAt: number | null = null;
    let oneTime: boolean | null = record?.oneTime ?? null;

    if (peek.status === "revoked") {
      state = "revoked";
    } else if (peek.status === "active") {
      state = "active";
      expiresAt = peek.record.createdAt + peek.record.ttl;
      oneTime = peek.record.oneTime;
    } else if (peek.status === "consumed") {
      state = "consumed";
      oneTime = record?.oneTime ?? true;
    } else if (accesses.length > 0 || senderToken) {
      state = "missing";
    }

    const data: VaultInsightsData = {
      state,
      expiresAt,
      oneTime,
      ...summary,
      accesses: accesses.slice().reverse(),
    };

    return jsonVaultSuccess(data);
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
