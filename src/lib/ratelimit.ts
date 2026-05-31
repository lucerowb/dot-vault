import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "@/lib/redis";
import {
  isRateLimitBypassed,
  type RateLimitResult,
} from "@/lib/rate-limit-utils";

let _upload: Ratelimit | null = null;
let _download: Ratelimit | null = null;
let _auth: Ratelimit | null = null;

function uploadLimiter(): Ratelimit {
  if (!_upload) {
    _upload = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "dotvault:ratelimit:upload",
    });
  }
  return _upload;
}

function downloadLimiter(): Ratelimit {
  if (!_download) {
    _download = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(50, "1 h"),
      prefix: "dotvault:ratelimit:download",
    });
  }
  return _download;
}

function authLimiter(): Ratelimit {
  if (!_auth) {
    _auth = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, "15 m"),
      prefix: "dotvault:ratelimit:auth",
    });
  }
  return _auth;
}

function bypassed(): RateLimitResult {
  return { success: true, remaining: 999 };
}

export async function limitUpload(identifier: string): Promise<RateLimitResult> {
  if (isRateLimitBypassed()) return bypassed();
  const { success, remaining, reset } = await uploadLimiter().limit(identifier);
  return { success, remaining, reset };
}

export async function limitDownload(identifier: string): Promise<RateLimitResult> {
  if (isRateLimitBypassed()) return bypassed();
  const { success, remaining, reset } = await downloadLimiter().limit(identifier);
  return { success, remaining, reset };
}

function hasRedisEnv(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

export async function limitAuth(
  identifier: string,
): Promise<RateLimitResult> {
  if (!hasRedisEnv() || isRateLimitBypassed()) {
    return bypassed();
  }
  const { success, remaining, reset } = await authLimiter().limit(identifier);
  return { success, remaining, reset };
}
