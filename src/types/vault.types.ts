import type { VaultTtlSeconds } from "@/lib/vault-ttl";

export type { VaultTtlSeconds };

export type VaultRecord = {
  iv: string;
  ciphertext: string;
  createdAt: number;
  ttl: VaultTtlSeconds;
  oneTime: boolean;
  deleteToken: string;
};

/** Create response: deleteToken is revealed once; not part of the share URL fragment. */
export type CreateVaultResponseData = {
  token: string;
  expiresAt: number;
  deleteToken: string;
};

export type GetVaultResponseData = {
  iv: string;
  ciphertext: string;
  expiresAt: number;
  oneTime: boolean;
};

/** Recorded when a recipient fetches ciphertext (sender-only via delete token). */
export type VaultAccessEvent = {
  at: number;
  ip: string;
  userAgent: string | null;
  referer: string | null;
};

export type VaultInsightsData = {
  state: "active" | "consumed" | "missing" | "revoked";
  expiresAt: number | null;
  oneTime: boolean | null;
  openCount: number;
  uniqueIps: number;
  firstOpenedAt: number | null;
  lastOpenedAt: number | null;
  safetyHint: "not_opened" | "opened_once" | "opened_multiple" | "multiple_ips";
  accesses: VaultAccessEvent[];
};

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    /** Unix ms when the rate limit window resets. */
    retryAtMs?: number;
  };
};

export type FragmentV1 = { version: 1; keyMaterial: Uint8Array };
export type FragmentV2 = {
  version: 2;
  salt: Uint8Array;
  wrappedKey: Uint8Array;
};
export type ParsedFragment = FragmentV1 | FragmentV2;
