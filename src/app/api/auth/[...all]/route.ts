import { toNextJsHandler } from "better-auth/next-js";

import { jsonError } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { limitAuth } from "@/lib/ratelimit";

const handlers = toNextJsHandler(auth);

async function withAuthRateLimit(
  request: Request,
  handler: (req: Request) => Promise<Response>,
): Promise<Response> {
  const ip = getClientIp(request);
  const { success, remaining } = await limitAuth(ip);
  if (!success) {
    return jsonError(
      "RATE_LIMITED",
      "Too many auth requests. Try again later.",
      429,
      remaining !== undefined
        ? { "X-RateLimit-Remaining": String(remaining) }
        : undefined,
    );
  }
  return handler(request);
}

export function GET(request: Request) {
  return withAuthRateLimit(request, handlers.GET);
}

export function POST(request: Request) {
  return withAuthRateLimit(request, handlers.POST);
}

export function PUT(request: Request) {
  return withAuthRateLimit(request, handlers.PUT);
}

export function PATCH(request: Request) {
  return withAuthRateLimit(request, handlers.PATCH);
}

export function DELETE(request: Request) {
  return withAuthRateLimit(request, handlers.DELETE);
}
