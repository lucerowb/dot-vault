import { NextResponse } from "next/server";

import type { ApiError, ApiSuccess } from "@/types/vault.types";

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, init);
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit
) {
  const body: ApiError = {
    success: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status, headers });
}
