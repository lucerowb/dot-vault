/** Allowed vault TTLs in seconds (Zod + UI + types). */
export const VAULT_TTL_SECONDS = [
  300,
  900,
  3600,
  28800,
  86400,
  604800,
] as const;

export type VaultTtlSeconds = (typeof VAULT_TTL_SECONDS)[number];

export const TTL_OPTIONS: { label: string; value: VaultTtlSeconds }[] = [
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
  { label: "1 hour", value: 3600 },
  { label: "8 hours", value: 28800 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
];
