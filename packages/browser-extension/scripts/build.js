#!/usr/bin/env node
import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pkgRoot, "../..");
const outDir = join(pkgRoot, "dist");
const iconSource = join(repoRoot, "src/app/icon.png");
const ICON_SIZES = [16, 32, 48, 128];

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

  await buildIcons();
}

async function buildIcons() {
  if (!existsSync(iconSource)) {
    throw new Error(
      `Extension icon source missing at ${iconSource}. Expected src/app/icon.png in the repo root.`,
    );
  }

  const iconsOut = join(outDir, "icons");
  mkdirSync(iconsOut, { recursive: true });

  await Promise.all(
    ICON_SIZES.map(async (size) => {
      await sharp(iconSource)
        .resize(size, size)
        .png()
        .toFile(join(iconsOut, `icon${size}.png`));
    }),
  );
}

await build();
