import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".dotvault");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/** Old CLI default; re-resolve from env when still stored in ~/.dotvault/config.json */
const LEGACY_DEFAULT_API_URL = "https://dotvault.io";

let projectEnvLoaded = false;

/** Load `.env.local` / `.env` from cwd and parent dirs (monorepo-friendly). */
function loadProjectEnv(): void {
  if (projectEnvLoaded) return;
  projectEnvLoaded = true;

  let dir = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    for (const file of [".env.local", ".env"]) {
      const envPath = path.join(dir, file);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

export function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/**
 * Resolve API base URL (no trailing slash).
 * Priority: saved config (via getConfig) > DOTVAULT_API_URL > BETTER_AUTH_URL >
 * NEXT_PUBLIC_APP_URL > http://localhost:3000
 */
export function resolveDefaultApiUrl(): string {
  loadProjectEnv();

  const fromEnv = [
    process.env.DOTVAULT_API_URL,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const value of fromEnv) {
    const trimmed = value?.trim();
    if (trimmed) {
      return normalizeApiUrl(trimmed);
    }
  }

  return "http://localhost:3000";
}

/** @deprecated Use {@link resolveDefaultApiUrl} — kept for messages that need a URL at import time. */
export function getDefaultApiUrl(): string {
  return resolveDefaultApiUrl();
}

interface Config {
  apiUrl: string;
  apiToken?: string;
  defaultProject?: string;
}

function migrateApiUrl(apiUrl: string | undefined): string {
  const url = apiUrl?.trim();
  if (!url) {
    return resolveDefaultApiUrl();
  }
  const normalized = normalizeApiUrl(url);
  if (normalized === LEGACY_DEFAULT_API_URL) {
    return resolveDefaultApiUrl();
  }
  return normalized;
}

export async function getConfig(): Promise<Config> {
  const apiUrl = resolveDefaultApiUrl();

  try {
    await fs.ensureDir(CONFIG_DIR);
    const exists = await fs.pathExists(CONFIG_FILE);
    if (!exists) {
      return { apiUrl };
    }
    const content = (await fs.readJson(CONFIG_FILE)) as Partial<Config>;
    return {
      ...content,
      apiUrl: migrateApiUrl(content.apiUrl),
    };
  } catch {
    return { apiUrl };
  }
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
  const current = await getConfig();
  const next: Config = {
    ...current,
    ...config,
    apiUrl: config.apiUrl ? normalizeApiUrl(config.apiUrl) : current.apiUrl,
  };
  await fs.writeJson(CONFIG_FILE, next, { spaces: 2 });
}

export async function clearConfig(): Promise<void> {
  await fs.remove(CONFIG_FILE);
}

export async function isAuthenticated(): Promise<boolean> {
  const config = await getConfig();
  return !!config.apiToken;
}

export async function requireAuth(): Promise<string> {
  const config = await getConfig();
  if (!config.apiToken) {
    throw new Error(
      'Not authenticated. Run "dot-vault login" to authenticate.',
    );
  }
  return config.apiToken;
}
