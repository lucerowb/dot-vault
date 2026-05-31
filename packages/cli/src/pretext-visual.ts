/**
 * Pretext-inspired typographic ASCII (DotVault logo).
 * @see https://chenglou.me/pretext/variable-typographic-ascii/
 */

import chalk from "chalk";
import { buildLogoMask, LOGO_MASK_H, LOGO_MASK_W } from "./logo-mask.js";

const DENSITY_RAMP =
  ' .\'`^",:;!iIl|/\\()[]{}1tfrjxcvuELXCJFZ0985@#&%$*+=~<>';

const MASK = buildLogoMask();

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Subtle field — stable on logo, shimmer on background. */
export function sampleField(x: number, y: number, t: number): number {
  const ax = 18 + Math.sin(t * 0.7) * 6;
  const ay = 7 + Math.cos(t * 0.55) * 2.5;
  const d1 = 1 / (1 + Math.hypot(x - ax, y - ay) * 0.65);
  const wave =
    Math.sin(x * 0.38 + t * 0.9) * Math.cos(y * 0.32 - t * 0.65) * 0.12;
  return clamp01(d1 * 0.35 + wave + 0.25);
}

function pickChar(brightness: number): string {
  const i = Math.round(brightness * (DENSITY_RAMP.length - 1));
  return DENSITY_RAMP[Math.max(0, Math.min(DENSITY_RAMP.length - 1, i))]!;
}

function colorize(char: string, brightness: number, mask: number): string {
  if (mask < 0.1) return chalk.hex("#1a2744")(char);
  if (mask > 0.9) return chalk.white.bold(char);
  if (brightness > 0.65) return chalk.cyan.bold(char);
  if (brightness > 0.4) return chalk.cyan(char);
  if (brightness > 0.25) return chalk.blueBright(char);
  return chalk.hex("#5b21b6")(char);
}

export function renderLogoFrame(t: number): string[] {
  const lines: string[] = [];
  for (let y = 0; y < LOGO_MASK_H; y++) {
    let line = "  ";
    for (let x = 0; x < LOGO_MASK_W; x++) {
      const mask = MASK[y]?.[x] ?? 0;
      const field = sampleField(x, y, t);
      const brightness =
        mask > 0.15
          ? clamp01(0.35 + mask * 0.55 + field * 0.15)
          : clamp01(field * 0.35);
      const ch = pickChar(brightness);
      line += colorize(ch, brightness, mask);
    }
    lines.push(line);
  }
  return lines;
}

export function supportsVisual(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function printLogoBlock(t: number): number {
  const art = renderLogoFrame(t);
  const footer = chalk.gray(
    `  ${"─".repeat(44)}\n  ${chalk.white("DotVault")} ${chalk.gray("·")} secure .env sync ${chalk.gray("·")} ${chalk.cyan("dv")}\n`,
  );
  for (const line of art) console.log(line);
  console.log(footer);
  return art.length + 2;
}

export async function playLogoAnimation(frames = 10): Promise<void> {
  if (!supportsVisual()) {
    printLogoBlock(0);
    return;
  }

  const hide = "\x1b[?25l";
  const show = "\x1b[?25h";
  process.stdout.write(hide);
  try {
    let lineCount = printLogoBlock(0);
    await sleep(80);
    for (let f = 1; f < frames; f++) {
      process.stdout.write(`\x1b[${lineCount}A`);
      const art = renderLogoFrame(f * 0.35);
      const footer = chalk.gray(
        `  ${"─".repeat(44)}\n  ${chalk.white("DotVault")} ${chalk.gray("·")} secure .env sync ${chalk.gray("·")} ${chalk.cyan("dv")}\n`,
      );
      for (const line of art) process.stdout.write("\x1b[2K" + line + "\n");
      process.stdout.write("\x1b[2K" + footer);
      lineCount = art.length + 2;
      await sleep(80);
    }
    process.stdout.write(show);
    console.log();
  } catch (err) {
    process.stdout.write(show);
    throw err;
  }
}

export function printLogoStatic(): void {
  printLogoBlock(0);
  console.log();
}
