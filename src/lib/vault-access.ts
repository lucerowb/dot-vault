import type { Redis } from "@upstash/redis";

import { getClientIp } from "@/lib/ip";
import type { VaultAccessEvent, VaultRecord } from "@/types/vault.types";

const MAX_ACCESS_EVENTS = 50;
const TOMBSTONE_TTL_SECONDS = 86_400;
/** Keep access logs after the vault payload is gone (revoke / one-time consume). */
export const ACCESS_LOG_RETENTION_SECONDS = 7 * 86_400;

export function accessLogKey(token: string): string {
  return `vault:access:${token}`;
}

function parseAccessLog(raw: unknown): VaultAccessEvent[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(isAccessEvent);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isAccessEvent) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isAccessEvent(value: unknown): value is VaultAccessEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as VaultAccessEvent;
  return typeof e.at === "number" && typeof e.ip === "string";
}

export function buildVaultAccessEvent(request: Request): VaultAccessEvent {
  const ua = request.headers.get("user-agent");
  const referer = request.headers.get("referer");
  return {
    at: Math.floor(Date.now() / 1000),
    ip: getClientIp(request),
    userAgent: ua ? ua.slice(0, 512) : null,
    referer: referer ? referer.slice(0, 512) : null,
  };
}

function accessLogTtlSeconds(record: VaultRecord): number {
  const now = Math.floor(Date.now() / 1000);
  const vaultRemaining = record.createdAt + record.ttl - now;
  return Math.max(
    vaultRemaining,
    TOMBSTONE_TTL_SECONDS,
    ACCESS_LOG_RETENTION_SECONDS,
  );
}

export async function recordVaultAccess(
  redis: Redis,
  token: string,
  record: VaultRecord,
  event: VaultAccessEvent,
): Promise<void> {
  const key = accessLogKey(token);
  const existing = parseAccessLog(await redis.get(key));
  const events = [...existing, event].slice(-MAX_ACCESS_EVENTS);
  await redis.set(key, events, { ex: accessLogTtlSeconds(record) });
}

export async function getVaultAccessLog(
  redis: Redis,
  token: string,
): Promise<VaultAccessEvent[]> {
  return parseAccessLog(await redis.get(accessLogKey(token)));
}

export async function extendAccessLogRetention(
  redis: Redis,
  token: string,
): Promise<void> {
  const key = accessLogKey(token);
  const events = parseAccessLog(await redis.get(key));
  if (!events.length) return;
  await redis.set(key, events, { ex: ACCESS_LOG_RETENTION_SECONDS });
}

export function summarizeAccessLog(accesses: VaultAccessEvent[]): {
  openCount: number;
  uniqueIps: number;
  firstOpenedAt: number | null;
  lastOpenedAt: number | null;
  safetyHint:
    | "not_opened"
    | "opened_once"
    | "opened_multiple"
    | "multiple_ips";
} {
  if (!accesses.length) {
    return {
      openCount: 0,
      uniqueIps: 0,
      firstOpenedAt: null,
      lastOpenedAt: null,
      safetyHint: "not_opened",
    };
  }

  const ips = new Set(
    accesses.map((a) => a.ip).filter((ip) => ip && ip !== "unknown"),
  );
  const sorted = [...accesses].sort((a, b) => a.at - b.at);
  const openCount = accesses.length;
  const uniqueIps = ips.size || 1;

  let safetyHint: "opened_once" | "opened_multiple" | "multiple_ips" =
    "opened_once";
  if (uniqueIps > 1) {
    safetyHint = "multiple_ips";
  } else if (openCount > 1) {
    safetyHint = "opened_multiple";
  }

  return {
    openCount,
    uniqueIps,
    firstOpenedAt: sorted[0]?.at ?? null,
    lastOpenedAt: sorted[sorted.length - 1]?.at ?? null,
    safetyHint,
  };
}
