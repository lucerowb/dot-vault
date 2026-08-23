import { webcrypto } from "node:crypto";

const PBKDF2_ITERATIONS = 600_000;
const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export interface QuickShareInput {
  content: string;
  ttlSeconds: number;
  oneTime: boolean;
  passphrase?: string;
  apiUrl: string;
}

export interface QuickShareResult {
  url: string;
  token: string;
  deleteToken: string;
  expiresAt: number;
}

async function generateDataKey(): Promise<CryptoKey> {
  return webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return webcrypto.subtle.importKey(
    "raw",
    bits,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/**
 * Encrypt content locally (AES-256-GCM) and upload ciphertext only.
 * The decryption key lives in the URL fragment — the server never
 * sees it. Mirrors the browser quick-share protocol (v1 / v2 fragments).
 */
export async function createQuickShare(
  input: QuickShareInput,
): Promise<QuickShareResult> {
  if (!input.content) throw new Error("Nothing to share.");
  if (input.passphrase !== undefined && input.passphrase.length === 0) {
    throw new Error("Passphrase cannot be empty.");
  }

  const key = await generateDataKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(input.content),
  );
  const ciphertext = new Uint8Array(cipherBuf);

  const base = input.apiUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/api/vault`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      iv: toBase64(iv),
      ciphertext: toBase64(ciphertext),
      ttl: input.ttlSeconds,
      oneTime: input.oneTime,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { token?: string; expiresAt?: number; deleteToken?: string };
    error?: { message?: string } | string;
    message?: string;
  };

  if (!response.ok || !body.data?.token) {
    const msg =
      (typeof body.error === "object" ? body.error?.message : body.error) ||
      body.message ||
      `Quick share failed (HTTP ${response.status})`;
    throw new Error(msg);
  }

  let fragment: string;
  if (input.passphrase) {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await deriveWrappingKey(input.passphrase, salt);
    const wrapped = await webcrypto.subtle.wrapKey(
      "raw",
      key,
      wrappingKey,
      "AES-KW",
    );
    fragment = `v2.${toBase64Url(salt)}.${toBase64Url(new Uint8Array(wrapped))}`;
  } else {
    const raw = await webcrypto.subtle.exportKey("raw", key);
    fragment = `v1.${toBase64Url(new Uint8Array(raw))}`;
  }

  return {
    url: `${base}/r/${body.data.token}#${fragment}`,
    token: body.data.token,
    deleteToken: body.data.deleteToken ?? "",
    expiresAt: body.data.expiresAt ?? 0,
  };
}

/** Revoke a quick share before it expires. */
export async function revokeQuickShare(
  apiUrl: string,
  token: string,
  deleteToken: string,
): Promise<void> {
  const base = apiUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/api/vault/${token}`, {
    method: "DELETE",
    headers: { "X-Delete-Token": deleteToken },
  });
  if (!response.ok && response.status !== 204 && response.status !== 404) {
    throw new Error(`Revoke failed (HTTP ${response.status})`);
  }
}
