import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pkgRoot, "../..");

/** Same priority as packages/cli/src/config.ts resolveDefaultApiUrl() */
const ENV_KEYS = [
  "DOTVAULT_API_URL",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
];

export function normalizeApiUrl(url) {
  return url.trim().replace(/\/$/, "");
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadProjectEnv() {
  let dir = repoRoot;
  for (let depth = 0; depth < 8; depth++) {
    for (const file of [".env.local", ".env"]) {
      parseEnvFile(join(dir, file));
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

/**
 * URL baked into the extension at build time from env files / process env.
 * Returns null when no explicit URL is set (user must configure in the popup).
 */
export function resolveBuildDefaultApiUrl() {
  loadProjectEnv();

  for (const key of ENV_KEYS) {
    const trimmed = process.env[key]?.trim();
    if (trimmed) {
      return normalizeApiUrl(trimmed);
    }
  }

  return null;
}

export function resolveBuildDefaults() {
  const apiUrl = resolveBuildDefaultApiUrl();
  return {
    apiUrl,
    /** When true, first-run setup is skipped (URL came from build env). */
    serverConfigured: apiUrl !== null,
  };
}
