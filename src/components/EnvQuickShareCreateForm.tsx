"use client";

import Link from "next/link";
import { useState } from "react";

import { useNowMs } from "@/hooks/use-now-ms";

import { RateLimitCountdown } from "@/components/RateLimitCountdown";
import { ShareLink } from "@/components/ShareLink";
import { getErrorMessage } from "@/lib/api-client";
import { addEnvQuickShare } from "@/lib/env-quick-shares";
import {
  createQuickShare,
  QuickShareRateLimitError,
} from "@/lib/quick-share-client";
import { toastError, toastSuccess } from "@/lib/toast";
import { TTL_OPTIONS, type VaultTtlSeconds } from "@/lib/vault-ttl";

type Props = {
  projectId: string;
  envId: string;
  envLabel: string;
  loadPlaintext: () => Promise<string | undefined>;
  onCreated?: () => void;
};

export function EnvQuickShareCreateForm({
  projectId,
  envId,
  envLabel,
  loadPlaintext,
  onCreated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [ttl, setTtl] = useState<VaultTtlSeconds>(300);
  const [oneTime, setOneTime] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitUntilMs, setRateLimitUntilMs] = useState<number | null>(null);
  const [share, setShare] = useState<{
    url: string;
    deleteToken: string;
    expiresAt: number;
    token: string;
  } | null>(null);
  const nowMs = useNowMs();

  async function generate() {
    setError(null);
    if (usePassphrase && !passphrase.trim()) {
      const msg = "Enter a passphrase or disable passphrase protection.";
      setError(msg);
      toastError(msg);
      return;
    }
    setBusy(true);
    try {
      const plaintext = await loadPlaintext();
      if (!plaintext) {
        const msg = "Could not load env from vault.";
        setError(msg);
        toastError(msg);
        return;
      }

      const result = await createQuickShare({
        plaintext,
        ttl,
        oneTime,
        passphrase: usePassphrase ? passphrase : undefined,
      });
      addEnvQuickShare(projectId, {
        token: result.token,
        envId,
        envLabel,
        expiresAt: result.expiresAt,
        oneTime,
        createdAt: Math.floor(Date.now() / 1000),
        ttlSeconds: ttl,
        shareUrl: result.url,
        deleteToken: result.deleteToken,
      });
      setShare(result);
      toastSuccess("Ephemeral link created");
      onCreated?.();
    } catch (e) {
      if (e instanceof QuickShareRateLimitError) {
        setRateLimitUntilMs(e.retryAtMs);
        setError(null);
        toastError("Too many uploads — wait before creating another link");
      } else {
        setRateLimitUntilMs(null);
        const msg = getErrorMessage(e, "Could not create quick share link.");
        setError(msg);
        toastError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const rateLimited = rateLimitUntilMs !== null && rateLimitUntilMs > nowMs;

  function resetForm() {
    setShare(null);
    setError(null);
    setRateLimitUntilMs(null);
    setPassphrase("");
    setUsePassphrase(false);
    setOneTime(false);
  }

  if (share) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          Link created. It appears in <strong>Active links</strong> below — you
          can copy or revoke it anytime before it expires.
        </p>
        <ShareLink
          shareUrl={share.url}
          deleteToken={share.deleteToken}
          expiresAt={share.expiresAt}
          token={share.token}
        />
        <button
          type="button"
          onClick={resetForm}
          className="text-sm text-blue-700 underline dark:text-blue-400"
        >
          Create another link
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Creates an ephemeral Redis link (same crypto as{" "}
        <Link
          href="/quick-share"
          className="text-blue-700 underline dark:text-blue-400"
        >
          quick share
        </Link>
        ). Recipients only get access until expiry, one-time open, or you revoke
        it.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Expires after
          </legend>
          <div className="flex flex-wrap gap-2">
            {TTL_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={busy}
                onClick={() => setTtl(o.value)}
                className={[
                  "rounded-full px-3 py-1.5 text-sm transition",
                  ttl === o.value
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
                ].join(" ")}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={oneTime}
              disabled={busy}
              onChange={(e) => setOneTime(e.target.checked)}
              className="size-4 rounded border-zinc-300 text-blue-600 dark:border-zinc-600"
            />
            One-time link
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={usePassphrase}
              disabled={busy}
              onChange={(e) => setUsePassphrase(e.target.checked)}
              className="size-4 rounded border-zinc-300 text-blue-600 dark:border-zinc-600"
            />
            Passphrase on link
          </label>
          {usePassphrase ? (
            <input
              type="password"
              disabled={busy}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          ) : null}
        </div>
      </div>
      {rateLimitUntilMs ? (
        <RateLimitCountdown
          retryAtMs={rateLimitUntilMs}
          onReady={() => {
            setRateLimitUntilMs(null);
            toastSuccess("You can create another link now");
          }}
        />
      ) : null}
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy || rateLimited}
        onClick={() => void generate()}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {busy ? "Creating link…" : "Generate ephemeral link"}
      </button>
    </div>
  );
}
