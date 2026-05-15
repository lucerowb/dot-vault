function parseTrustedProxyDepth(): number {
  const raw = process.env.TRUSTED_PROXY_DEPTH?.trim();
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/** Client IP from X-Forwarded-For using the trusted (rightmost) hop(s). */
function ipFromForwarded(forwarded: string, depth: number): string | null {
  const parts = forwarded
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const index = Math.max(0, parts.length - Math.max(1, depth));
  return parts[index] ?? null;
}

export function getClientIp(request: Request): string {
  const depth = parseTrustedProxyDepth();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = ipFromForwarded(forwarded, depth);
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}
