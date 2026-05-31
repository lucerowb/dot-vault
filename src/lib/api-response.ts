import { NextResponse } from "next/server";

import type { ApiError, ApiSuccess } from "@/types/vault.types";

/** Prevent intermediaries from caching vault ciphertext or one-time payloads. */
export const VAULT_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
} as const;

export function vaultResponseInit(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(VAULT_RESPONSE_HEADERS)) {
    headers.set(key, value);
  }
  return { ...init, headers };
}

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, init);
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit,
  errorExtras?: Omit<ApiError["error"], "code" | "message">,
) {
  const body: ApiError = {
    success: false,
    error: { code, message, ...errorExtras },
  };
  return NextResponse.json(body, { status, headers });
}

export function jsonVaultSuccess<T>(data: T, init?: ResponseInit) {
  return jsonSuccess(data, vaultResponseInit(init));
}

export function jsonVaultError(
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit,
  errorExtras?: Omit<ApiError["error"], "code" | "message">,
) {
  const merged = new Headers(VAULT_RESPONSE_HEADERS);
  if (headers) {
    new Headers(headers).forEach((value, key) => merged.set(key, value));
  }
  return jsonError(code, message, status, merged, errorExtras);
}
