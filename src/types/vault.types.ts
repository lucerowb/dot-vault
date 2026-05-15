export type VaultTtlSeconds = 3600 | 28800 | 86400 | 604800;

export type VaultRecord = {
  iv: string;
  ciphertext: string;
  createdAt: number;
  ttl: VaultTtlSeconds;
  oneTime: boolean;
  deleteToken: string;
};

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

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string };
};

export type FragmentV1 = { version: 1; keyMaterial: Uint8Array };
export type FragmentV2 = {
  version: 2;
  salt: Uint8Array;
  wrappedKey: Uint8Array;
};
export type ParsedFragment = FragmentV1 | FragmentV2;
