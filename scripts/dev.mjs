#!/usr/bin/env node
/**
 * Run Next.js and the Docusaurus docs dev server together.
 * Next.js proxies /docs/* → http://127.0.0.1:3456 (see next.config.ts).
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const pnpm = isWin ? "pnpm.cmd" : "pnpm";

const children = [];

function run(label, args) {
  const child = spawn(pnpm, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code !== 0 && code !== null) {
      shutdown(code);
    }
  });
  children.push({ label, child });
}

function shutdown(code = 0) {
  for (const { child } of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const docsStaticDir = join(root, "public", "docs");
if (existsSync(docsStaticDir)) {
  rmSync(docsStaticDir, { recursive: true, force: true });
  console.log(
    "[dev] Removed public/docs/ so /docs/ proxies to the Docusaurus dev server.\n",
  );
}

console.log("[dev] Starting Docusaurus (http://127.0.0.1:3456/docs/) …");
run("docs", ["--filter", "@dot-vault/docs-site", "start"]);

console.log("[dev] Starting Next.js (http://localhost:3000, /docs/ proxied) …");
run("web", ["exec", "next", "dev"]);
