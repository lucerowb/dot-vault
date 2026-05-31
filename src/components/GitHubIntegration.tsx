"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  GuideNote,
  GuideSteps,
  IntegrationGuideModal,
} from "@/components/IntegrationGuideModal";
import { getErrorMessage } from "@/lib/api-client";
import {
  INTEGRATION_GUIDE_CARDS,
  type IntegrationGuideId,
} from "@/lib/integration-guides";
import {
  useGitHubStatus,
  useSecretPatterns,
  useSecretScan,
} from "@/hooks/use-github";

export function GitHubIntegration() {
  const [scanContent, setScanContent] = useState("");
  const [openGuide, setOpenGuide] = useState<IntegrationGuideId | null>(null);

  const statusQuery = useGitHubStatus();
  const patternsQuery = useSecretPatterns();
  const scanMutation = useSecretScan();

  const status = statusQuery.data;
  const patterns = patternsQuery.data ?? [];
  const scanResult = scanMutation.data ?? null;
  const loading = statusQuery.isPending;

  const activeGuide = INTEGRATION_GUIDE_CARDS.find((g) => g.id === openGuide);

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600";
    }
  }

  function getSeverityEmoji(severity: string): string {
    switch (severity) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      case "low":
        return "🔵";
      default:
        return "⚪";
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <div className="mr-3 inline-block size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading integration…
      </div>
    );
  }

  if (statusQuery.error) {
    return (
      <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
        {getErrorMessage(statusQuery.error, "Failed to load integration")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Integration
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Connect GitHub for pull-request secret scanning, install the DotVault
          app on your repositories, and scan snippets locally before you push.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          How to get started
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Follow these guides in order. Each opens step-by-step instructions in
          a modal.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {INTEGRATION_GUIDE_CARDS.map((guide, index) => (
            <li
              key={guide.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Step {index + 1}
              </span>
              <h4 className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {guide.title}
              </h4>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {guide.summary}
              </p>
              <button
                type="button"
                onClick={() => setOpenGuide(guide.id)}
                className="mt-3 self-start text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                View guide →
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          GitHub App status
        </h3>

        {status?.configured ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                GitHub App is configured on this deployment
              </span>
            </div>

            {status.appInstallationUrl ? (
              <a
                href={status.appInstallationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <svg
                  className="mr-2 size-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Install GitHub App
              </a>
            ) : null}

            <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-400">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                When installed, this deployment can:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Scan pull requests for leaked secrets</li>
                <li>Comment on PRs with security findings</li>
                <li>Update GitHub check runs on your repos</li>
                <li>Help block risky pushes to protected branches</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-2.5 rounded-full bg-amber-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                GitHub App not configured on this server
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p>
                An administrator must set GitHub App credentials before install
                works. Open{" "}
                <button
                  type="button"
                  onClick={() => setOpenGuide("github-app-setup")}
                  className="font-medium underline underline-offset-2"
                >
                  Configure the GitHub App
                </button>{" "}
                for the full checklist, or see{" "}
                <code className="rounded bg-black/5 px-1 text-xs dark:bg-white/10">
                  .env.example
                </code>
                .
              </p>
              <ul className="mt-3 space-y-1 font-mono text-xs">
                <li>GITHUB_CLIENT_ID</li>
                <li>GITHUB_CLIENT_SECRET</li>
                <li>GITHUB_APP_ID</li>
                <li>GITHUB_APP_PRIVATE_KEY</li>
                <li>GITHUB_WEBHOOK_SECRET</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Secret scanner
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Paste code or configuration to scan for exposed secrets and API
              keys.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenGuide("secret-scanner")}
            className="text-sm text-blue-700 hover:underline dark:text-blue-400"
          >
            How to use →
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <textarea
            value={scanContent}
            onChange={(e) => setScanContent(e.target.value)}
            placeholder="Paste your code here to scan for secrets…"
            className="h-48 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (!scanContent.trim()) return;
                scanMutation.mutate({ content: scanContent });
              }}
              disabled={!scanContent.trim() || scanMutation.isPending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {scanMutation.isPending ? (
                <>
                  <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Scanning…
                </>
              ) : (
                "Scan for secrets"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setScanContent("");
                scanMutation.reset();
              }}
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          </div>

          {scanMutation.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(scanMutation.error, "Scan failed")}
            </p>
          ) : null}
        </div>

        <AnimatePresence>
          {scanResult ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-6"
            >
              {scanResult.summary.total === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">
                    No secrets detected
                  </p>
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                    No API keys, passwords, or tokens were found in this paste.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                    <p className="font-medium text-red-800 dark:text-red-200">
                      {scanResult.summary.total} finding
                      {scanResult.summary.total > 1 ? "s" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-red-700 dark:text-red-300">
                      <span>Critical: {scanResult.summary.critical}</span>
                      <span>High: {scanResult.summary.high}</span>
                      <span>Medium: {scanResult.summary.medium}</span>
                      <span>Low: {scanResult.summary.low}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {scanResult.findings.map((finding, index) => (
                      <motion.div
                        key={`${finding.line}-${finding.column}-${index}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`rounded-lg border p-3 ${getSeverityColor(
                          finding.severity,
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          <span aria-hidden>
                            {getSeverityEmoji(finding.severity)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{finding.type}</div>
                            <div className="text-sm opacity-90">
                              {finding.description}
                            </div>
                            <div className="mt-2 rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/5">
                              Line {finding.line}, col {finding.column}:{" "}
                              {finding.snippet}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Supported secret patterns
        </h3>
        {patternsQuery.isPending ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Loading patterns…
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {patterns.slice(0, 10).map((pattern, index) => (
                <div
                  key={`${pattern.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950/50"
                >
                  <span className="text-xs" aria-hidden>
                    {getSeverityEmoji(pattern.severity)}
                  </span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {pattern.name}
                  </span>
                </div>
              ))}
            </div>
            {patterns.length > 10 ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                And {patterns.length - 10} more patterns…
              </p>
            ) : null}
          </>
        )}
      </section>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Full reference:{" "}
        <code className="text-zinc-600 dark:text-zinc-300">
          docs/GITHUB_INTEGRATION.md
        </code>{" "}
        in the DotVault repository.
      </p>

      {activeGuide ? (
        <IntegrationGuideModal
          open={!!openGuide}
          title={activeGuide.modalTitle}
          onClose={() => setOpenGuide(null)}
        >
          <GuideSteps steps={activeGuide.steps} />
          {activeGuide.id === "github-app-setup" ? (
            <GuideNote>
              Self-hosting? Copy variables from{" "}
              <code className="font-mono text-xs">.env.example</code> and
              redeploy. The Integration tab status indicator turns green when
              the server can reach GitHub.
            </GuideNote>
          ) : null}
          {activeGuide.id === "pr-scanning" ? (
            <GuideNote>
              Webhook delivery must use your public HTTPS URL. Local development
              requires a tunnel (for example ngrok) pointing at your dev server.
            </GuideNote>
          ) : null}
        </IntegrationGuideModal>
      ) : null}
    </div>
  );
}
