import type { VaultRecord } from "@/types/vault.types";

/** Parse vault JSON whether Upstash returned a string or a deserialized object. */
export function parseVaultRecord(raw: unknown): VaultRecord | null {
  if (raw == null || raw === false) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as VaultRecord;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    const candidate = raw as VaultRecord;
    if (
      typeof candidate.iv === "string" &&
      typeof candidate.ciphertext === "string" &&
      typeof candidate.createdAt === "number" &&
      typeof candidate.ttl === "number"
    ) {
      return candidate;
    }
  }

  return null;
}
