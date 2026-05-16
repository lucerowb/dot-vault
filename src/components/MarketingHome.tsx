"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { LogoMark, LogoWordmark } from "@/components/Logo";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function MarketingHome() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.18),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(99,102,241,0.08),transparent),radial-gradient(ellipse_50%_30%_at_0%_80%,rgba(14,165,233,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.22),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(99,102,241,0.12),transparent),radial-gradient(ellipse_50%_30%_at_0%_80%,rgba(14,165,233,0.08),transparent)]"
        aria-hidden
      />

      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-24 pt-14 text-center md:pb-32 md:pt-20">
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="mb-8 flex flex-col items-center gap-5"
        >
          <LogoMark className="h-20 w-20 opacity-95 md:h-24 md:w-24" />
          <LogoWordmark className="h-10 w-auto max-w-[min(280px,85vw)] object-contain md:h-12" />
        </motion.div>

        <motion.span
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 32, delay: 0.04 }}
          className="mb-6 inline-flex rounded-full border border-zinc-200/80 bg-white/70 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:text-zinc-400"
        >
          Zero-knowledge · Ephemeral · Cloud optional
        </motion.span>

        <motion.h1
          {...fadeUp}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 28,
            delay: 0.05,
          }}
          className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-6xl md:leading-[1.08]"
        >
          Share secrets like <span className="text-blue-600 dark:text-blue-400">.env</span>{" "}
          files without handing plaintext to infra.
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ type: "spring", stiffness: 280, damping: 30, delay: 0.1 }}
          className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 md:text-xl"
        >
          DotVault encrypts in the browser, stores ciphertext in the cloud,
          and keeps decryption keys out of HTTP — so accidental logs and
          server compromise never see your variables.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.14 }}
          className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        >
          <Link
            href="/quick-share"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 dark:bg-blue-500 dark:shadow-blue-500/20 dark:hover:bg-blue-600"
          >
            Try quick share
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-8 py-3.5 text-base font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-3 text-base font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:py-3.5"
          >
            Sign in
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-14 text-xs text-zinc-500 dark:text-zinc-500"
        >
          Open source · Built with Better Auth · Supabase · Web Crypto · Upstash Redis
        </motion.p>
      </section>

      <section className="relative border-t border-zinc-100 bg-white/60 py-20 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 md:grid-cols-3">
          {[
            {
              title: "Quick share",
              body: "AES-256-GCM in your browser. One link, TTL you choose — key lives in the fragment, not in request headers.",
            },
            {
              title: "Cloud vault",
              body: "Sign in and keep envs organized by project. AES-256-GCM at rest with your own encryption key.",
            },
            {
              title: "Share from vault",
              body: "Turn any stored blob into an ephemeral quick link when you need a handoff outside your team tooling.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: i * 0.08,
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="rounded-3xl border border-zinc-100 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-none"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl"
          >
            Ready when your team needs a sane handoff.
          </motion.h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Engineers use DotVault instead of Slack search history and pasted secrets in docs.
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10"
          >
            <Link
              href="/quick-share"
              className="inline-flex rounded-xl bg-zinc-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Open quick share →
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="relative border-t border-zinc-200 bg-zinc-50/90 py-10 text-center backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex flex-col items-center gap-3 px-4">
          <LogoWordmark className="h-7 w-auto opacity-90" />
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Secure environment handoffs
          </p>
        </div>
      </footer>
    </div>
  );
}
