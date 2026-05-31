#!/usr/bin/env node
/** Build static docs once if missing (fallback before Docusaurus dev is ready). */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = join(root, "public", "docs", "index.html");

if (existsSync(indexPath)) {
  process.exit(0);
}

console.log("[predev] Building static docs into public/docs/ (first run) …");
const isWin = process.platform === "win32";
const result = spawnSync(isWin ? "pnpm.cmd" : "pnpm", ["run", "build:docs"], {
  cwd: root,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
