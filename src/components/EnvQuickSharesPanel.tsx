"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { EnvQuickShareCreateForm } from "@/components/EnvQuickShareCreateForm";
import { VaultShareAccessInsights } from "@/components/VaultShareAccessInsights";
import { getErrorMessage } from "@/lib/api-client";
import { fetchVaultInsights } from "@/lib/vault-insights-client";
import type { VaultInsightsData } from "@/types/vault.types";
import {
  type EnvQuickShareRecord,
  type EnvQuickShareStatus,
  getEnvQuickShareSnapshot,
  removeEnvQuickShareFromHistory,
  subscribeEnvQuickShares,
  updateEnvQuickShareStatus,
} from "@/lib/env-quick-shares";
import { toastCopied, toastError, toastSuccess } from "@/lib/toast";
import { revokeVaultToken } from "@/lib/vault-revoke-client";
import { TTL_OPTIONS } from "@/lib/vault-ttl";

type Props = {
  projectId: string;
  envId: string;
  envLabel: string;
  loadPlaintext: () => Promise<string | undefined>;
};

function ttlLabel(seconds: number): string {
  return TTL_OPTIONS.find((o) => o.value === seconds)?.label ?? `${seconds}s`;
}

function formatRemaining(expiresAt: number, nowSec: number): string {
  const left = Math.max(0, expiresAt - nowSec);
  if (left <= 0) return "Expired";
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function statusLabel(status: EnvQuickShareStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "consumed":
      return "Opened";
    case "revoked":
      return "Revoked";
  }
}

function statusClass(status: EnvQuickShareStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200";
    case "revoked":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    case "consumed":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100";
    case "expired":
      return "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

function ShareRow({
  share,
  nowSec,
  insights,
  insightsLoading,
  onRevoke,
  onRemove,
  busyToken,
}: {
  share: EnvQuickShareRecord;
  nowSec: number;
  insights: VaultInsightsData | null;
  insightsLoading: boolean;
  onRevoke: (share: EnvQuickShareRecord) => void;
  onRemove: (token: string) => void;
  busyToken: string | null;
}) {
  const [showUrl, setShowUrl] = useState(false);
  const [copied, setCopied] = useState(false);
  const remaining =
    share.status === "active" ? formatRemaining(share.expiresAt, nowSec) : null;

  async function copyLink() {
    await navigator.clipboard.writeText(share.shareUrl);
    setCopied(true);
    toastCopied("Share link");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/90">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {new Date(share.createdAt * 1000).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            TTL {ttlLabel(share.ttlSeconds)}
            {share.oneTime ? " · one-time" : " · reusable"}
            {share.revokedAt
              ? ` · revoked ${new Date(share.revokedAt * 1000).toLocaleString()}`
              : null}
          </p>
          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {share.token}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusClass(share.status),
          ].join(" ")}
        >
          {statusLabel(share.status)}
          {remaining ? ` · ${remaining}` : null}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {showUrl ? "Hide URL" : "Show URL"}
        </button>
        {share.status === "active" ? (
          <button
            type="button"
            disabled={busyToken === share.token}
            onClick={() => onRevoke(share)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
          >
            {busyToken === share.token ? "Revoking…" : "Revoke"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(share.token)}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Remove from history
        </button>
      </div>

      {showUrl ? (
        <code className="mt-3 block break-all rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          {share.shareUrl}
        </code>
      ) : null}

      <VaultShareAccessInsights insights={insights} loading={insightsLoading} />
    </li>
  );
}

export function EnvQuickSharesPanel({
  projectId,
  envId,
  envLabel,
  loadPlaintext,
}: Props) {
  const records = useSyncExternalStore(
    subscribeEnvQuickShares,
    () => getEnvQuickShareSnapshot(projectId, envId),
    () => [],
  );
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [insightsByToken, setInsightsByToken] = useState<
    Record<string, VaultInsightsData | null>
  >({});
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const id = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const recordTokens = records.map((r) => `${r.token}:${r.status}`).join(",");

  useEffect(() => {
    if (!records.length) return;

    let cancelled = false;

    async function syncInsights() {
      setInsightsLoading(true);
      const now = Math.floor(Date.now() / 1000);
      const nextInsights: Record<string, VaultInsightsData | null> = {};

      await Promise.all(
        records.map(async (r) => {
          try {
            const data = await fetchVaultInsights(r.token, r.deleteToken);
            nextInsights[r.token] = data;

            if (
              (data.state === "consumed" || data.state === "revoked") &&
              r.status === "active"
            ) {
              updateEnvQuickShareStatus(
                projectId,
                r.token,
                data.state === "revoked" ? "revoked" : "consumed",
              );
            } else if (
              data.state === "missing" &&
              r.expiresAt <= now &&
              r.status === "active"
            ) {
              updateEnvQuickShareStatus(projectId, r.token, "expired");
            } else if (
              data.state === "missing" &&
              r.status === "active" &&
              data.openCount > 0
            ) {
              updateEnvQuickShareStatus(projectId, r.token, "consumed");
            }
          } catch {
            nextInsights[r.token] = null;
            if (r.expiresAt <= now && r.status === "active") {
              updateEnvQuickShareStatus(projectId, r.token, "expired");
            }
          }
        }),
      );

      if (!cancelled) {
        setInsightsByToken((prev) => ({ ...prev, ...nextInsights }));
        setInsightsLoading(false);
      }
    }

    void syncInsights();
    const id = setInterval(() => {
      if (!cancelled) void syncInsights();
    }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [projectId, recordTokens, records]);

  const active = records.filter((r) => r.status === "active");
  const past = records.filter((r) => r.status !== "active");

  async function handleRevoke(share: EnvQuickShareRecord) {
    if (
      !confirm(
        "Revoke this link? Recipients will no longer be able to open it.",
      )
    ) {
      return;
    }
    setActionError(null);
    setBusyToken(share.token);
    try {
      await revokeVaultToken(share.token, share.deleteToken);
      updateEnvQuickShareStatus(projectId, share.token, "revoked", {
        revokedAt: Math.floor(Date.now() / 1000),
      });
      toastSuccess("Link revoked");
    } catch (e) {
      const msg = getErrorMessage(e, "Could not revoke link.");
      setActionError(msg);
      toastError(msg);
    } finally {
      setBusyToken(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Create ephemeral link
        </h2>
        <div className="mt-4">
          <EnvQuickShareCreateForm
            projectId={projectId}
            envId={envId}
            envLabel={envLabel}
            loadPlaintext={loadPlaintext}
          />
        </div>
      </section>

      {actionError ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {actionError}
        </p>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Active links
          {active.length > 0 ? (
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({active.length})
            </span>
          ) : null}
        </h2>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No active shares. Create a link above — it will appear here with
            copy and revoke controls.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {active.map((share) => (
              <ShareRow
                key={share.token}
                share={share}
                nowSec={nowSec}
                insights={insightsByToken[share.token] ?? null}
                insightsLoading={
                  insightsLoading && insightsByToken[share.token] === undefined
                }
                onRevoke={(s) => void handleRevoke(s)}
                onRemove={(token) => {
                  removeEnvQuickShareFromHistory(projectId, token);
                  toastSuccess("Removed from history");
                }}
                busyToken={busyToken}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Past links
          {past.length > 0 ? (
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({past.length})
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          History is stored in this browser only. Expired, opened, and revoked
          links stay listed so you can audit what you shared.
        </p>
        {past.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No past links yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {past.map((share) => (
              <ShareRow
                key={share.token}
                share={share}
                nowSec={nowSec}
                insights={insightsByToken[share.token] ?? null}
                insightsLoading={
                  insightsLoading && insightsByToken[share.token] === undefined
                }
                onRevoke={() => {}}
                onRemove={(token) => {
                  removeEnvQuickShareFromHistory(projectId, token);
                  toastSuccess("Removed from history");
                }}
                busyToken={busyToken}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
