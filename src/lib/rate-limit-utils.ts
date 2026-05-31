/** Skip Upstash rate limits (local dev and explicit opt-out). */
export function isRateLimitBypassed(): boolean {
  if (process.env.RATE_LIMIT_DISABLED === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export type RateLimitResult = {
  success: boolean;
  remaining?: number;
  /** Unix ms when the current window resets (Upstash). */
  reset?: number;
};

export function formatRetryCountdown(retryAtMs: number, nowMs = Date.now()): string {
  const totalSec = Math.max(0, Math.ceil((retryAtMs - nowMs) / 1000));
  if (totalSec <= 0) return "now";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
