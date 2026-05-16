"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Props = {
  shareUrl: string;
  deleteToken: string;
  expiresAt: number;
  token: string;
};

function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.floor(expiresAt - now / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return left <= 0 ? "Expired" : `${h}h ${m}m ${s}s`;
}

export function ShareLink({ shareUrl, deleteToken, expiresAt, token }: Props) {
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const countdown = useCountdown(expiresAt);

  const curlRevoke = useMemo(() => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    return `curl -X DELETE "${base}/api/vault/${token}" -H "X-Delete-Token: ${deleteToken}"`;
  }, [token, deleteToken]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyDelete() {
    await navigator.clipboard.writeText(deleteToken);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl space-y-6"
    >
      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Share link</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <code className="flex-1 break-all rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
            {shareUrl}
          </code>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => void copyLink()}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {copied ? "Copied" : "Copy link"}
          </motion.button>
        </div>
        <p className="mt-2 inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Expires in <span className="ml-1 font-medium tabular-nums">{countdown}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <strong className="font-medium">Sender only:</strong> save your delete token to revoke this vault before it expires. It is not included in the share link.
        <button
          type="button"
          className="ml-2 text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => setShowDelete((v) => !v)}
        >
          {showDelete ? "Hide" : "Reveal"}
        </button>
        {showDelete ? (
          <div className="mt-2 space-y-2">
            <code className="block break-all rounded-lg bg-white/80 px-2 py-1 text-xs dark:bg-zinc-900/80 dark:text-zinc-100">
              {deleteToken}
            </code>
            <button
              type="button"
              className="text-xs font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => void copyDelete()}
            >
              Copy delete token
            </button>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">
              {curlRevoke}
            </pre>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
