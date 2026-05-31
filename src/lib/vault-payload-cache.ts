/** Session cache so one-time vault opens can retry decrypt without re-fetching Redis. */

const PREFIX = "dotvault:vault-payload:";

export type CachedVaultPayload = {
  iv: string;
  ciphertext: string;
};

export function readCachedVaultPayload(
  token: string,
): CachedVaultPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${token}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedVaultPayload;
    if (
      typeof parsed.iv === "string" &&
      typeof parsed.ciphertext === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeCachedVaultPayload(
  token: string,
  payload: CachedVaultPayload,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${PREFIX}${token}`, JSON.stringify(payload));
}

export function clearCachedVaultPayload(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${PREFIX}${token}`);
}
