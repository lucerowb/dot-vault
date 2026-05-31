/** Browser-local registry of quick shares created from a project's env UI. */

export type EnvQuickShareStatus = "active" | "expired" | "consumed" | "revoked";

export type EnvQuickShareRecord = {
  token: string;
  envId: string;
  envLabel: string;
  expiresAt: number;
  oneTime: boolean;
  createdAt: number;
  ttlSeconds: number;
  /** Full share URL including the #fragment (stored only in this browser). */
  shareUrl: string;
  deleteToken: string;
  status: EnvQuickShareStatus;
  revokedAt?: number;
};

function storageKey(projectId: string): string {
  return `dotvault:env-quick-shares:${projectId}`;
}

function normalizeRecord(raw: EnvQuickShareRecord): EnvQuickShareRecord {
  const now = Math.floor(Date.now() / 1000);
  let status = raw.status ?? "active";
  if (status === "active" && raw.expiresAt <= now) {
    status = "expired";
  }
  return {
    ...raw,
    status,
    ttlSeconds: raw.ttlSeconds ?? Math.max(0, raw.expiresAt - raw.createdAt),
  };
}

export function listEnvQuickShares(projectId: string): EnvQuickShareRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EnvQuickShareRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord);
  } catch {
    return [];
  }
}

export const ENV_QUICK_SHARES_EVENT = "dotvault:env-quick-shares";

const snapshotCache = new Map<
  string,
  { records: EnvQuickShareRecord[]; signature: string }
>();

function snapshotSignature(records: EnvQuickShareRecord[]): string {
  return records.map((r) => `${r.token}:${r.expiresAt}:${r.status}`).join("|");
}

function invalidateSnapshotCache(projectId: string): void {
  for (const key of snapshotCache.keys()) {
    if (key.startsWith(`${projectId}:`)) snapshotCache.delete(key);
  }
}

export function envQuickSharesForEnv(
  projectId: string,
  envId: string,
): EnvQuickShareRecord[] {
  return listEnvQuickShares(projectId)
    .filter((r) => r.envId === envId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Stable snapshot for useSyncExternalStore (same reference until data changes). */
export function getEnvQuickShareSnapshot(
  projectId: string,
  envId: string,
): EnvQuickShareRecord[] {
  const cacheKey = `${projectId}:${envId}`;
  const fresh = envQuickSharesForEnv(projectId, envId);
  const signature = snapshotSignature(fresh);
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.signature === signature) {
    return cached.records;
  }
  snapshotCache.set(cacheKey, { records: fresh, signature });
  return fresh;
}

export function activeEnvQuickShareCount(
  projectId: string,
  envId: string,
): number {
  const now = Math.floor(Date.now() / 1000);
  return envQuickSharesForEnv(projectId, envId).filter(
    (r) => r.status === "active" && r.expiresAt > now,
  ).length;
}

export function subscribeEnvQuickShares(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(ENV_QUICK_SHARES_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ENV_QUICK_SHARES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function saveEnvQuickShares(
  projectId: string,
  records: EnvQuickShareRecord[],
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(projectId), JSON.stringify(records));
  invalidateSnapshotCache(projectId);
  window.dispatchEvent(
    new CustomEvent(ENV_QUICK_SHARES_EVENT, { detail: { projectId } }),
  );
}

export function addEnvQuickShare(
  projectId: string,
  record: Omit<EnvQuickShareRecord, "status"> & {
    status?: EnvQuickShareStatus;
  },
): EnvQuickShareRecord {
  const full: EnvQuickShareRecord = normalizeRecord({
    ...record,
    status: record.status ?? "active",
  });
  const existing = listEnvQuickShares(projectId).filter(
    (r) => r.token !== full.token,
  );
  saveEnvQuickShares(projectId, [full, ...existing]);
  return full;
}

export function updateEnvQuickShareStatus(
  projectId: string,
  token: string,
  status: EnvQuickShareStatus,
  extra?: Pick<EnvQuickShareRecord, "revokedAt">,
): void {
  const records = listEnvQuickShares(projectId).map((r) =>
    r.token === token ? { ...r, ...extra, status } : r,
  );
  saveEnvQuickShares(projectId, records);
}

export function removeEnvQuickShareFromHistory(
  projectId: string,
  token: string,
): void {
  saveEnvQuickShares(
    projectId,
    listEnvQuickShares(projectId).filter((r) => r.token !== token),
  );
}
