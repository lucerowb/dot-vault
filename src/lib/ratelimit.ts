import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "@/lib/redis";

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

export async function limitUpload(
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  const { success, remaining } = await uploadLimiter().limit(identifier);
  return { success, remaining };
}

export async function limitDownload(
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  const { success, remaining } = await downloadLimiter().limit(identifier);
  return { success, remaining };
}

function hasRedisEnv(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

export async function limitAuth(
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!hasRedisEnv()) {
    return { success: true };
  }
  const { success, remaining } = await authLimiter().limit(identifier);
  return { success, remaining };
}
