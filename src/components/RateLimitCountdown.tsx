"use client";

import { useEffect, useState } from "react";

import { formatRetryCountdown } from "@/lib/rate-limit-utils";

type Props = {
  retryAtMs: number;
  title?: string;
  onReady?: () => void;
};

export function RateLimitCountdown({
  retryAtMs,
  title = "Too many quick share uploads",
  onReady,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const leftMs = retryAtMs - now;
  const ready = leftMs <= 0;

  useEffect(() => {
    if (ready) onReady?.();
  }, [ready, onReady]);

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
      role="alert"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        {ready ? (
          <>You can try again now. Click the button to create a link.</>
        ) : (
          <>
            You can create another link in{" "}
            <span className="font-semibold tabular-nums">
              {formatRetryCountdown(retryAtMs, now)}
            </span>
            {" "}
            <span className="text-xs opacity-80">
              (at {new Date(retryAtMs).toLocaleTimeString()})
            </span>
          </>
        )}
      </p>
    </div>
  );
}
