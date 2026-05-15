import { z } from "zod";

import type { VaultTtlSeconds } from "@/types/vault.types";

const TTL_VALUES = [3600, 28800, 86400, 604800] as const satisfies readonly VaultTtlSeconds[];

function decodeBase64ToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded =
      pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export const CreateVaultSchema = z.object({
  iv: z
    .string()
    .min(8)
    .max(32)
    .refine((s) => {
      const bytes = decodeBase64ToBytes(s);
      return bytes !== null && bytes.length === 12;
    }, "IV must be base64/base64url of exactly 12 bytes"),
  ciphertext: z.string().max(1_400_000),
  ttl: z.union([
    z.literal(TTL_VALUES[0]),
    z.literal(TTL_VALUES[1]),
    z.literal(TTL_VALUES[2]),
    z.literal(TTL_VALUES[3]),
  ]),
  oneTime: z.boolean().default(false),
});

export type CreateVaultInput = z.infer<typeof CreateVaultSchema>;

export const VaultTokenSchema = z
  .string()
  .regex(/^tk_[a-f0-9]{32}$/, "Invalid vault token");
