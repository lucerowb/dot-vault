import { jsonVaultError } from "@/lib/api-response";
import type { RateLimitResult } from "@/lib/rate-limit-utils";

export function vaultRateLimitedResponse(
  kind: "upload" | "download",
  result: Pick<RateLimitResult, "remaining" | "reset">,
) {
  const retryAtMs = result.reset ?? Date.now() + 3_600_000;
  const retryAfterSec = Math.max(1, Math.ceil((retryAtMs - Date.now()) / 1000));
  const label = kind === "upload" ? "uploads" : "downloads";

  return jsonVaultError(
    "RATE_LIMITED",
    `Too many quick share ${label}. Please wait before trying again.`,
    429,
    {
      "X-RateLimit-Remaining": String(result.remaining ?? 0),
      "Retry-After": String(retryAfterSec),
      "X-RateLimit-Reset": String(retryAtMs),
    },
    { retryAtMs },
  );
}
