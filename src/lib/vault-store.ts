import { Redis } from "@upstash/redis";

import type { VaultRecord } from "@/types/vault.types";

function requireRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
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

const TOMBSTONE_TTL_SECONDS = 86_400;

/** Atomic read for one-time vs multi-read vaults; sets consumed tombstone when one-time. */
const VAULT_FETCH_LUA = `
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

export async function fetchVaultAtomic(
  redis: Redis,
  token: string
): Promise<FetchVaultResult> {
  const keys = [vaultKey(token), consumedKey(token)];
  const raw = (await redis.eval(
    VAULT_FETCH_LUA,
    keys,
    [String(TOMBSTONE_TTL_SECONDS)]
  )) as unknown;

  if (!Array.isArray(raw) || raw.length < 1) {
    return { status: 404 };
  }

  const code = Number(raw[0]);
  if (code === 404) return { status: 404 };
  if (code === 410) return { status: 410 };
  if (code !== 200 || typeof raw[1] !== "string") {
    return { status: 404 };
  }

  try {
    const record = JSON.parse(raw[1]) as VaultRecord;
    return { status: 200, record };
  } catch {
    return { status: 404 };
  }
}

export async function saveVault(
  redis: Redis,
  token: string,
  record: VaultRecord
): Promise<void> {
  const key = vaultKey(token);
  const payload = JSON.stringify(record);
  await redis.set(key, payload, { ex: record.ttl });
}

export async function deleteVaultKeys(
  redis: Redis,
  token: string
): Promise<void> {
  await redis.del(vaultKey(token), consumedKey(token));
}

export async function readVaultForDelete(
  redis: Redis,
  token: string
): Promise<VaultRecord | null> {
  const raw = await redis.get<string>(vaultKey(token));
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as VaultRecord;
  } catch {
    return null;
  }
}

export { TOMBSTONE_TTL_SECONDS };
