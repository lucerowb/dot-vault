"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { createQuickShare } from "@/lib/quick-share-client";
import { TTL_OPTIONS, type VaultTtlSeconds } from "@/lib/vault-ttl";

import { ShareLink } from "@/components/ShareLink";
import { UploadZone } from "@/components/UploadZone";

export function QuickSharePanel() {
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

  async function encryptAndUpload(text: string) {
    setError(null);
    if (usePassphrase && !passphrase.trim()) {
      setError("Enter a passphrase or disable passphrase protection.");
      return;
    }
    setBusy(true);
    try {
      const result = await createQuickShare({
        plaintext: text,
        ttl,
        oneTime,
        passphrase: usePassphrase ? passphrase : undefined,
      });
      setShare(result);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <header className="mb-12 max-w-xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Quick share
        </motion.h1>
        <p className="mt-3 text-balance text-zinc-600 dark:text-zinc-400">
          Encrypt in your browser, upload ciphertext only. The key stays in the URL
          fragment — never sent to the server. Need long-term storage?{" "}
          <Link
            href="/dashboard"
            className="text-blue-700 hover:underline dark:text-blue-400"
          >
            Cloud vault
          </Link>
        </p>
      </header>

      {!share ? (
        <>
          <div id="share" className="flex w-full flex-col items-center">
            <UploadZone
              disabled={busy}
              onFile={(t) => void encryptAndUpload(t)}
              onPasteText={(t) => void encryptAndUpload(t)}
            />

            <div className="mt-10 grid w-full max-w-xl gap-6 sm:grid-cols-2">
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
                  One-time link (deleted after first open)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={usePassphrase}
                    disabled={busy}
                    onChange={(e) => setUsePassphrase(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-blue-600 dark:border-zinc-600"
                  />
                  Passphrase (PBKDF2 + AES-KW)
                </label>
                {usePassphrase ? (
                  <input
                    type="password"
                    disabled={busy}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Passphrase"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                ) : null}
              </div>
            </div>

            {error ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 max-w-xl text-center text-sm text-red-700 dark:text-red-400"
              >
                {error}
              </motion.p>
            ) : null}
          </div>
        </>
      ) : (
        <ShareLink
          shareUrl={share.url}
          deleteToken={share.deleteToken}
          expiresAt={share.expiresAt}
          token={share.token}
        />
      )}

      {share ? (
        <button
          type="button"
          className="mt-10 text-sm text-blue-700 underline-offset-2 hover:underline dark:text-blue-400"
          onClick={() => setShare(null)}
        >
          Share another file
        </button>
      ) : null}

      <footer className="mt-auto pt-16 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <Link
          href="/"
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
      </footer>
    </div>
  );
}
