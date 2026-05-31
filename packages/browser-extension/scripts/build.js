#!/usr/bin/env node
import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(pkgRoot, "dist");

mkdirSync(outDir, { recursive: true });

const buildOptions = {
  bundle: true,
  target: "chrome120",
  format: "iife",
  logLevel: "info",
};

async function build() {
  await esbuild.build({
    ...buildOptions,
    entryPoints: [join(pkgRoot, "src/background.ts")],
    outfile: join(outDir, "background.js"),
  });

  await esbuild.build({
    ...buildOptions,
    entryPoints: [join(pkgRoot, "src/content.ts")],
    outfile: join(outDir, "content.js"),
  });

  cpSync(join(pkgRoot, "manifest.json"), join(outDir, "manifest.json"));
  cpSync(join(pkgRoot, "popup/popup.html"), join(outDir, "popup.html"));
  cpSync(join(pkgRoot, "popup/popup.js"), join(outDir, "popup.js"));
  cpSync(join(pkgRoot, "popup/popup.css"), join(outDir, "popup.css"));
  cpSync(join(pkgRoot, "content/content.css"), join(outDir, "content.css"));

  const icons = join(pkgRoot, "icons");
  if (existsSync(icons)) {
    cpSync(icons, join(outDir, "icons"), { recursive: true });
  }
}

await build();
