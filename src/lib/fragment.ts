import { base64UrlToBytes, bytesToBase64Url } from "@/lib/base64url";
import type { ParsedFragment } from "@/types/vault.types";

const PREFIX_V1 = "v1.";
const PREFIX_V2 = "v2.";

export function buildFragmentV1(keyMaterial: Uint8Array): string {
  return `${PREFIX_V1}${bytesToBase64Url(keyMaterial)}`;
}

export function buildFragmentV2(salt: Uint8Array, wrappedKey: Uint8Array): string {
  return `${PREFIX_V2}${bytesToBase64Url(salt)}.${bytesToBase64Url(wrappedKey)}`;
}

export function parseFragment(raw: string): ParsedFragment | null {
  const value = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!value) return null;

  if (value.startsWith(PREFIX_V1)) {
    const b64 = value.slice(PREFIX_V1.length);
    try {
      const keyMaterial = base64UrlToBytes(b64);
      if (keyMaterial.length !== 32) return null;
      return { version: 1, keyMaterial };
    } catch {
      return null;
    }
  }

  if (value.startsWith(PREFIX_V2)) {
    const rest = value.slice(PREFIX_V2.length);
    const dot = rest.indexOf(".");
    if (dot === -1) return null;
    try {
      const salt = base64UrlToBytes(rest.slice(0, dot));
      const wrappedKey = base64UrlToBytes(rest.slice(dot + 1));
      if (salt.length < 8 || wrappedKey.length < 8) return null;
      return { version: 2, salt, wrappedKey };
    } catch {
      return null;
    }
  }

  return null;
}
