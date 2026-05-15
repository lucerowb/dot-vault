import type { ApiError, ApiSuccess } from "@/types/vault.types";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccess<T> | ApiError;
  if (!res.ok || !json.success) {
    const message = json.success ? "Request failed" : json.error.message;
    const code = json.success ? undefined : json.error.code;
    throw new ApiRequestError(message, res.status, code);
  }
  return json.data;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  return parseJson<T>(res);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
  return parseJson<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE", cache: "no-store" });
  if (res.status === 204) return;
  await parseJson<unknown>(res);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
