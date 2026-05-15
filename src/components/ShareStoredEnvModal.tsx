"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { createQuickShare } from "@/lib/quick-share-client";
import type { VaultTtlSeconds } from "@/types/vault.types";

import { ShareLink } from "@/components/ShareLink";

const TTL_OPTIONS: { label: string; value: VaultTtlSeconds }[] = [
  { label: "1 hour", value: 3600 },
  { label: "8 hours", value: 28800 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
];

type Props = {
  projectId: string;
  envId: string;
  envLabel: string;
  open: boolean;
  onClose: () => void;
};

export function ShareStoredEnvModal({
  projectId,
  envId,
  envLabel,
  open,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [ttl, setTtl] = useState<VaultTtlSeconds>(86400);
  const [oneTime, setOneTime] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<{
    url: string;
    deleteToken: string;
    expiresAt: number;
    token: string;
  } | null>(null);

  if (!open) return null;

  async function generate() {
    setError(null);
    if (usePassphrase && !passphrase.trim()) {
      setError("Enter a passphrase or disable passphrase protection.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/envs/${encodeURIComponent(envId)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: { content: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message ?? "Could not load env from vault.");
        return;
      }

      const result = await createQuickShare({
        plaintext: json.data.content,
        ttl,
        oneTime,
        passphrase: usePassphrase ? passphrase : undefined,
      });
      setShare(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create quick share link."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setShare(null);
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="share-env-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="share-env-title" className="font-semibold text-zinc-900">
            Quick share · {envLabel}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm text-zinc-600">
            Creates an <strong>ephemeral Redis</strong> link (same crypto as{" "}
            <Link href="/quick-share" className="text-blue-700 underline">
              quick share
            </Link>
            ). Your cloud-stored ciphertext is untouched; recipients only get what
            you send in this new link until it expires or is revoked.
          </p>

          {!share ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">
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
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                        ].join(" ")}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                    <input
                      type="checkbox"
                      checked={oneTime}
                      disabled={busy}
                      onChange={(e) => setOneTime(e.target.checked)}
                      className="size-4 rounded border-zinc-300 text-blue-600"
                    />
                    One-time link
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                    <input
                      type="checkbox"
                      checked={usePassphrase}
                      disabled={busy}
                      onChange={(e) => setUsePassphrase(e.target.checked)}
                      className="size-4 rounded border-zinc-300 text-blue-600"
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
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2"
                    />
                  ) : null}
                </div>
              </div>
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void generate()}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Creating link…" : "Generate ephemeral link"}
              </button>
            </>
          ) : (
            <ShareLink
              shareUrl={share.url}
              deleteToken={share.deleteToken}
              expiresAt={share.expiresAt}
              token={share.token}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
