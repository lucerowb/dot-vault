"use client";

import type { VaultInsightsData } from "@/types/vault.types";

function safetyMessage(insights: VaultInsightsData): {
  text: string;
  className: string;
} {
  switch (insights.safetyHint) {
    case "not_opened":
      return {
        text: "Not opened yet — no one has downloaded the encrypted payload.",
        className:
          "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
      };
    case "opened_once":
      return {
        text:
          insights.oneTime === false
            ? `Opened ${insights.openCount} time(s) — reusable link.`
            : "Opened once — one-time link was used.",
        className:
          "border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
      };
    case "opened_multiple":
      return {
        text: `Opened ${insights.openCount} times from ${insights.uniqueIps} IP(s).`,
        className:
          "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
      };
    case "multiple_ips":
      return {
        text: `Warning: ${insights.openCount} open(s) from ${insights.uniqueIps} different IPs — consider revoking and re-sharing.`,
        className:
          "border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
      };
  }
}

function formatUa(ua: string | null): string {
  if (!ua) return "Unknown browser";
  if (ua.length <= 72) return ua;
  return `${ua.slice(0, 69)}…`;
}

type Props = {
  insights: VaultInsightsData | null;
  loading?: boolean;
};

export function VaultShareAccessInsights({ insights, loading }: Props) {
  if (loading) {
    return (
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Loading access info…
      </p>
    );
  }

  if (!insights) {
    return (
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Access details unavailable (delete token required).
      </p>
    );
  }

  const safety = safetyMessage(insights);

  return (
    <div className="mt-3 space-y-3">
      <div
        className={[
          "rounded-lg border px-3 py-2 text-xs leading-relaxed",
          safety.className,
        ].join(" ")}
      >
        {safety.text}
        {insights.lastOpenedAt ? (
          <span className="mt-1 block opacity-90">
            Last activity:{" "}
            {new Date(insights.lastOpenedAt * 1000).toLocaleString()}
          </span>
        ) : null}
      </div>

      {insights.accesses.length > 0 ? (
        <details className="group rounded-lg border border-zinc-200 dark:border-zinc-700">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
            Access log ({insights.openCount})
          </summary>
          <div className="max-h-48 overflow-auto border-t border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">IP</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {insights.accesses.map((row, i) => (
                  <tr key={`${row.at}-${row.ip}-${i}`}>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {new Date(row.at * 1000).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200">
                      {row.ip}
                    </td>
                    <td
                      className="max-w-[12rem] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400"
                      title={row.userAgent ?? undefined}
                    >
                      {formatUa(row.userAgent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
        Logged when someone loads ciphertext from this link. Decryption in the
        browser is not visible to the server. IPs may reflect VPNs or corporate
        gateways.
      </p>
    </div>
  );
}
