import { Redis } from "@upstash/redis";

import {
  ACCESS_LOG_RETENTION_SECONDS,
  accessLogKey,
  extendAccessLogRetention,
} from "@/lib/vault-access";
import { parseVaultRecord } from "@/lib/vault-record-parse";
import type { VaultRecord } from "@/types/vault.types";

function requireRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN",
    );
  }
  return new Redis({ url, token });
}

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) _redis = requireRedis();
  return _redis;
}

export function vaultKey(token: string): string {
  return `vault:${token}`;
}

export function consumedKey(token: string): string {
  return `vault:consumed:${token}`;
}

/** Lets the link creator fetch access logs after the payload is removed. */
export function senderKey(token: string): string {
  return `vault:sender:${token}`;
}

export function revokedKey(token: string): string {
  return `vault:revoked:${token}`;
}

const TOMBSTONE_TTL_SECONDS = 86_400;

async function isRevoked(redis: Redis, token: string): Promise<boolean> {
  const exists = await redis.exists(revokedKey(token));
  return Number(exists) > 0;
}

export async function markVaultRevoked(redis: Redis, token: string): Promise<void> {
  await redis.set(revokedKey(token), "1", {
    ex: ACCESS_LOG_RETENTION_SECONDS,
  });
}

/** Atomic read for one-time vs multi-read vaults; sets consumed tombstone when one-time. */
const VAULT_FETCH_LUA = `
if redis.call('EXISTS', KEYS[3]) == 1 then
  return {404}
end
local payload = redis.call('GET', KEYS[1])
if payload == false then
  if redis.call('EXISTS', KEYS[2]) == 1 then
    return {410}
  end
  return {404}
end
local doc = cjson.decode(payload)
if doc.oneTime == true then
  redis.call('DEL', KEYS[1])
  redis.call('SET', KEYS[2], '1', 'EX', tonumber(ARGV[1]))
end
return {200, payload}
`;

export type FetchVaultResult =
  | { status: 200; record: VaultRecord }
  | { status: 404 }
  | { status: 410 };

export type VaultPeekResult =
  | { status: "active"; record: VaultRecord }
  | { status: "consumed" }
  | { status: "revoked" }
  | { status: "missing" };

export async function peekVault(
  redis: Redis,
  token: string,
): Promise<VaultPeekResult> {
  if (await isRevoked(redis, token)) {
    return { status: "revoked" };
  }

  const consumed = await redis.exists(consumedKey(token));
  if (Number(consumed) > 0) {
    return { status: "consumed" };
  }

  const raw = await redis.get(vaultKey(token));
  const record = parseVaultRecord(raw);
  if (!record) {
    return { status: "missing" };
  }
  return { status: "active", record };
}

export async function fetchVaultAtomic(
  redis: Redis,
  token: string,
): Promise<FetchVaultResult> {
  if (await isRevoked(redis, token)) {
    return { status: 404 };
  }

  const keys = [vaultKey(token), consumedKey(token), revokedKey(token)];
  const raw = (await redis.eval(VAULT_FETCH_LUA, keys, [
    String(TOMBSTONE_TTL_SECONDS),
  ])) as unknown;

  if (!Array.isArray(raw) || raw.length < 1) {
    return { status: 404 };
  }

  const code = Number(raw[0]);
  if (code === 404) return { status: 404 };
  if (code === 410) return { status: 410 };
  if (code !== 200) {
    return { status: 404 };
  }

  const record = parseVaultRecord(raw[1]);
  if (!record) {
    return { status: 404 };
  }
  return { status: 200, record };
}

export async function saveVault(
  redis: Redis,
  token: string,
  record: VaultRecord,
): Promise<void> {
  const key = vaultKey(token);
  const senderTtl = record.ttl + TOMBSTONE_TTL_SECONDS;
  await redis.set(key, record, { ex: record.ttl });
  await redis.set(senderKey(token), record.deleteToken, { ex: senderTtl });
}

export async function deleteVaultKeys(
  redis: Redis,
  token: string,
  options?: { preserveAccessLog?: boolean },
): Promise<void> {
  await redis.del(vaultKey(token), consumedKey(token));
  await markVaultRevoked(redis, token);
  if (options?.preserveAccessLog) {
    await extendAccessLogRetention(redis, token);
  } else {
    await redis.del(accessLogKey(token), senderKey(token));
  }
}

export async function readSenderDeleteToken(
  redis: Redis,
  token: string,
): Promise<string | null> {
  const raw = await redis.get<string>(senderKey(token));
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function readVaultForDelete(
  redis: Redis,
  token: string,
): Promise<VaultRecord | null> {
  const raw = await redis.get(vaultKey(token));
  return parseVaultRecord(raw);
}

export { TOMBSTONE_TTL_SECONDS };
