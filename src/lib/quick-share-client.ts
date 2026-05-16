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
    error?: { message?: string };
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Upload failed.");
  }

  const origin =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        window.location.origin
      : "";

  const url = `${origin}/r/${json.data.token}#${fragment}`;

  return {
    url,
    deleteToken: json.data.deleteToken,
    expiresAt: json.data.expiresAt,
    token: json.data.token,
  };
}
