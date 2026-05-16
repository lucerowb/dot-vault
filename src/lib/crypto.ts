import { buildFragmentV1, buildFragmentV2 } from "@/lib/fragment";
import type { ParsedFragment } from "@/types/vault.types";

const AES_GCM = { name: "AES-GCM" as const, length: 256 as const };
const PBKDF2_ITERATIONS = 600_000;

/** Copy into a tight ArrayBuffer for Web Crypto `BufferSource` typing. */
function copyToArrayBuffer(u: Uint8Array): ArrayBuffer {
  const c = new Uint8Array(u.length);
  c.set(u);
  return c.buffer;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded =
    pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function generateAesGcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES_GCM, true, ["encrypt", "decrypt"]);
}

export async function exportRawAesKey(key: CryptoKey): Promise<Uint8Array> {
  const bufOut = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(bufOut);
}

export async function importRawAesGcmKey(
  raw: Uint8Array,
  extractable = true
): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", copyToArrayBuffer(raw), AES_GCM, extractable, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptUtf8(
  plaintext: string,
  key: CryptoKey
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const data = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: copyToArrayBuffer(iv) },
    key,
    data
  );
  return { iv, ciphertext: new Uint8Array(cipherBuf) };
}

export async function decryptUtf8(
  iv: Uint8Array,
  ciphertext: Uint8Array,
  key: CryptoKey
): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: copyToArrayBuffer(iv) },
    key,
    copyToArrayBuffer(ciphertext)
  );
  return new TextDecoder().decode(plainBuf);
}

export async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: copyToArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey(
    "raw",
    copyToArrayBuffer(new Uint8Array(bits)),
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export async function wrapAesKey(
  dataKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    dataKey,
    wrappingKey,
    "AES-KW"
  );
  return new Uint8Array(wrapped);
}

export async function unwrapToAesGcmKey(
  wrapped: Uint8Array,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    copyToArrayBuffer(wrapped),
    wrappingKey,
    "AES-KW",
    AES_GCM,
    true,
    ["decrypt"]
  );
}

export function randomSalt(bytes = 16): Uint8Array {
  const salt = new Uint8Array(bytes);
  crypto.getRandomValues(salt);
  return salt;
}

/** Build URL hash fragment for sharing (never sent to server). */
export async function buildShareFragment(
  key: CryptoKey,
  options?: { passphrase?: string }
): Promise<string> {
  if (!options?.passphrase) {
    const raw = await exportRawAesKey(key);
    return buildFragmentV1(raw);
  }
  const salt = randomSalt(16);
  const wrappingKey = await deriveWrappingKey(options.passphrase, salt);
  const wrapped = await wrapAesKey(key, wrappingKey);
  return buildFragmentV2(salt, wrapped);
}

export async function importKeyFromFragment(
  fragment: ParsedFragment,
  passphrase?: string
): Promise<CryptoKey> {
  if (fragment.version === 1) {
    return importRawAesGcmKey(fragment.keyMaterial);
  }
  if (!passphrase) {
    throw new Error("Passphrase required");
  }
  const wrappingKey = await deriveWrappingKey(passphrase, fragment.salt);
  return unwrapToAesGcmKey(fragment.wrappedKey, wrappingKey);
}

export { PBKDF2_ITERATIONS };
