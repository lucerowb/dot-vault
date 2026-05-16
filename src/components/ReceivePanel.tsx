"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import {
  base64ToBytes,
  decryptUtf8,
  importKeyFromFragment,
} from "@/lib/crypto";
import { parseFragment } from "@/lib/fragment";
import type { ParsedFragment } from "@/types/vault.types";

type Phase =
  | { kind: "loading" }
  | { kind: "need_passphrase"; fragment: ParsedFragment }
  | { kind: "decrypting" }
  | { kind: "ready"; plaintext: string }
  | { kind: "error"; message: string };

type Props = { token: string };

export function ReceivePanel({ token }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [pass, setPass] = useState("");

  const runDecrypt = useCallback(
    async (fragment: ParsedFragment, passphrase?: string) => {
      setPhase({ kind: "decrypting" });
      try {
        const res = await fetch(`/api/vault/${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { iv: string; ciphertext: string };
          error?: { message?: string };
        };

        if (res.status === 410) {
          setPhase({
            kind: "error",
            message:
              json.error?.message ??
              "This one-time link was already opened.",
          });
          return;
        }
        if (!res.ok || !json.success || !json.data) {
          setPhase({
            kind: "error",
            message: json.error?.message ?? "Could not load this vault.",
          });
          return;
        }

        const key = await importKeyFromFragment(fragment, passphrase);
        const iv = base64ToBytes(json.data.iv);
        const ciphertext = base64ToBytes(json.data.ciphertext);
        const plaintext = await decryptUtf8(iv, ciphertext, key);
        setPhase({ kind: "ready", plaintext });
      } catch {
        setPhase({
          kind: "error",
          message:
            "Could not decrypt. Wrong passphrase or corrupted payload.",
        });
      }
    },
    [token]
  );

  useEffect(() => {
    queueMicrotask(() => {
      const hash = window.location.hash.replace(/^#/, "");
      const parsed = parseFragment(hash);
      if (!parsed) {
        setPhase({
          kind: "error",
          message:
            "Missing decryption key in the URL fragment. Open the full link you were sent, including everything after #.",
        });
        return;
      }
      if (parsed.version === 2) {
        setPhase({ kind: "need_passphrase", fragment: parsed });
        return;
      }
      void runDecrypt(parsed);
    });
  }, [runDecrypt, token]);

  async function onSubmitPassphrase(e: React.FormEvent) {
    e.preventDefault();
    if (phase.kind !== "need_passphrase") return;
    await runDecrypt(phase.fragment, pass);
  }

  async function copyPlain() {
    if (phase.kind !== "ready") return;
    await navigator.clipboard.writeText(phase.plaintext);
  }

  function downloadEnv() {
    if (phase.kind !== "ready") return;
    const blob = new Blob([phase.plaintext], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dotvault.env";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (phase.kind === "loading" || phase.kind === "decrypting") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-zinc-600 dark:text-zinc-400">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-zinc-200 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-400"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        />
        <p className="text-sm">
          {phase.kind === "decrypting" ? "Decrypting…" : "Fetching vault…"}
        </p>
      </div>
    );
  }

  if (phase.kind === "need_passphrase") {
    return (
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onSubmit={(e) => void onSubmitPassphrase(e)}
        className="w-full max-w-md space-y-4"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This link is passphrase-protected. Enter the passphrase you received
          out-of-band from the sender.
        </p>
        <input
          type="password"
          autoComplete="off"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Passphrase"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Decrypt
        </motion.button>
      </motion.form>
    );
  }

  if (phase.kind === "error") {
    return (
      <motion.div
        initial={{ x: [0, -6, 6, -4, 4, 0] }}
        transition={{ duration: 0.45 }}
        className="max-w-lg rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
      >
        {phase.message}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl space-y-4"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Decrypted locally in your browser. The server never saw this plaintext.
      </p>
      <pre className="max-h-[min(24rem,50vh)] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left text-xs leading-relaxed text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
        {phase.plaintext}
      </pre>
      <div className="flex flex-wrap gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => void copyPlain()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Copy to clipboard
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={downloadEnv}
          className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Download .env
        </motion.button>
      </div>
    </motion.div>
  );
}
