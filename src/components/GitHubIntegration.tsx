"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { getErrorMessage } from "@/lib/api-client";
import {
  useGitHubStatus,
  useSecretPatterns,
  useSecretScan,
} from "@/hooks/use-github";

export function GitHubIntegration() {
  const [scanContent, setScanContent] = useState("");

  const statusQuery = useGitHubStatus();
  const patternsQuery = useSecretPatterns();
  const scanMutation = useSecretScan();

  const status = statusQuery.data;
  const patterns = patternsQuery.data ?? [];
  const scanResult = scanMutation.data ?? null;
  const loading = statusQuery.isPending;

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
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
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
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-3" />
        Loading GitHub integration...
      </div>
    );
  }

  if (statusQuery.error) {
    return (
      <div className="p-8 text-center text-red-500 dark:text-red-400">
        {getErrorMessage(
          statusQuery.error,
          "Failed to load GitHub integration",
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          GitHub Integration
        </h3>

        {status?.configured ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300">
                GitHub App is configured
              </span>
            </div>

            {status.appInstallationUrl && (
              <a
                href={status.appInstallationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Install GitHub App
              </a>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <p className="font-medium mb-2">Features enabled:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Automatic secret scanning on pull requests</li>
                <li>PR comments with security findings</li>
                <li>Check status updates</li>
                <li>Push protection for main branches</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300">
                GitHub App not configured
              </span>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <p>
                To enable GitHub integration, configure the following
                environment variables:
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                <li>GITHUB_CLIENT_ID</li>
                <li>GITHUB_CLIENT_SECRET</li>
                <li>GITHUB_APP_ID</li>
                <li>GITHUB_WEBHOOK_SECRET</li>
                <li>GITHUB_APP_TOKEN</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Secret Scanner
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Paste code or configuration to scan for exposed secrets and API keys.
        </p>

        <div className="space-y-4">
          <textarea
            value={scanContent}
            onChange={(e) => setScanContent(e.target.value)}
            placeholder="Paste your code here to scan for secrets..."
            className="w-full h-48 px-4 py-3 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-white"
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (!scanContent.trim()) return;
                scanMutation.mutate({ content: scanContent });
              }}
              disabled={!scanContent.trim() || scanMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scanMutation.isPending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                "Scan for Secrets"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setScanContent("");
                scanMutation.reset();
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              {scanResult.summary.total === 0 ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-medium text-green-800 dark:text-green-400">
                      No secrets detected!
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Your code looks clean. No API keys, passwords, or tokens
                    were found.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span className="font-medium text-red-800 dark:text-red-400">
                        {scanResult.summary.total} secret
                        {scanResult.summary.total > 1 ? "s" : ""} detected
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-red-700 dark:text-red-300">
                        🔴 Critical: {scanResult.summary.critical}
                      </span>
                      <span className="text-orange-700 dark:text-orange-300">
                        🟠 High: {scanResult.summary.high}
                      </span>
                      <span className="text-yellow-700 dark:text-yellow-300">
                        🟡 Medium: {scanResult.summary.medium}
                      </span>
                      <span className="text-blue-700 dark:text-blue-300">
                        🔵 Low: {scanResult.summary.low}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {scanResult.findings.map((finding, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-lg border ${getSeverityColor(
                          finding.severity,
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">
                            {getSeverityEmoji(finding.severity)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{finding.type}</div>
                            <div className="text-sm opacity-80">
                              {finding.description}
                            </div>
                            <div className="mt-2 text-xs font-mono bg-black/5 dark:bg-white/5 p-2 rounded">
                              Line {finding.line}, Col {finding.column}:{" "}
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
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Supported Secret Patterns
        </h3>
        {patternsQuery.isPending ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading patterns…
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {patterns.slice(0, 10).map((pattern, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                >
                  <span className="text-xs">
                    {getSeverityEmoji(pattern.severity)}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {pattern.name}
                  </span>
                </div>
              ))}
            </div>
            {patterns.length > 10 && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                And {patterns.length - 10} more patterns...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
