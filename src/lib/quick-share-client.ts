import {
  buildShareFragment,
  bytesToBase64,
  encryptUtf8,
  generateAesGcmKey,
} from "@/lib/crypto";
import type { VaultTtlSeconds } from "@/lib/vault-ttl";

const MAX_PLAINTEXT = 1_000_000;

export type QuickShareResult = {
  url: string;
  deleteToken: string;
  expiresAt: number;
  token: string;
};

export class QuickShareRateLimitError extends Error {
  readonly retryAtMs: number;

  constructor(retryAtMs: number, message?: string) {
    super(
      message ??
        "Too many quick share uploads. Please wait before creating another link.",
    );
    this.name = "QuickShareRateLimitError";
    this.retryAtMs = retryAtMs;
  }
}

function parseRetryAtMs(res: Response, json: { error?: { retryAtMs?: number } }): number {
  const header = res.headers.get("X-RateLimit-Reset");
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (typeof json.error?.retryAtMs === "number") {
    return json.error.retryAtMs;
  }
  return Date.now() + 3_600_000;
}

export async function createQuickShare(options: {
  plaintext: string;
  ttl: VaultTtlSeconds;
  oneTime: boolean;
  passphrase?: string;
}): Promise<QuickShareResult> {
  if (options.plaintext.length > MAX_PLAINTEXT) {
    throw new Error("Content exceeds 1 MB limit.");
  }

  const passphrase = options.passphrase?.trim();
  if (passphrase === "") {
    throw new Error("Enter a passphrase or disable passphrase protection.");
  }

  const key = await generateAesGcmKey();
  const { iv, ciphertext } = await encryptUtf8(options.plaintext, key);
  const fragment = await buildShareFragment(key, {
    passphrase: passphrase || undefined,
  });

  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertext),
      ttl: options.ttl,
      oneTime: options.oneTime,
    }),
  });

  const json = (await res.json()) as {
    success?: boolean;
    data?: { token: string; expiresAt: number; deleteToken: string };
    error?: { message?: string; code?: string; retryAtMs?: number };
  };

  if (res.status === 429 || json.error?.code === "RATE_LIMITED") {
    throw new QuickShareRateLimitError(
      parseRetryAtMs(res, json),
      json.error?.message,
    );
  }

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Upload failed.");
  }

  // Always use the origin that created the vault so Redis and the link stay aligned.
  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  const url = `${origin}/r/${json.data.token}#${fragment}`;

  return {
    url,
    deleteToken: json.data.deleteToken,
    expiresAt: json.data.expiresAt,
    token: json.data.token,
  };
}
