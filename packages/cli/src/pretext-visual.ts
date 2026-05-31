/**
 * Pretext-inspired typographic ASCII for the terminal.
 * Brightness field + per-cell density ramp (see chenglou/pretext variable typographic ASCII).
 * @see https://chenglou.me/pretext/variable-typographic-ascii/
 * @see https://github.com/chenglou/pretext
 */

import chalk from "chalk";

/** Light → dark, mixed widths (monospace approximation of proportional density). */
/** Light → dark; mixed glyphs approximate proportional density (pretext-style). */
const DENSITY_RAMP =
  ' .\'`^",:;!iIl|/\\()[]{}1tfrjxcvuELXCJFZ0985@#&%$*+=~<>';

const W = 54;
const H = 12;

/** DotVault wordmark mask (1 = inside glyph). */
const MASK: number[][] = (() => {
  const g = Array.from({ length: H }, () => Array<number>(W).fill(0));
  const set = (x: number, y: number, v = 1) => {
    if (y >= 0 && y < H && x >= 0 && x < W) g[y]![x] = v;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) set(x, y, 1);
  };
  // Shield
  for (let y = 1; y <= 9; y++) {
    const w = y < 5 ? 2 + y : 11 - y;
    for (let x = 0; x < w; x++) set(x, y, 1);
  }
  set(1, 10, 1);
  set(2, 10, 1);
  set(3, 10, 1);
  rect(3, 4, 6, 7);
  rect(4, 3, 5, 3);
  // Large "DV" monogram
  const dv = [
    "xxxxxx       xxxxx",
    "xx   xx      xx  xx",
    "xx   xx      xx  xx",
    "xx   xx      xx  xx",
    "xx   xx  xx  xx  xx",
    "xxxxxx    xxxx  xx",
    "xx        xx    xx",
    "xx        xx    xx",
    "xx        xx    xxxxx",
    "xx        xx       xx",
    "xx        xx       xx",
    "xxxxxx    xxxxxxxxxx",
  ];
  const ox = 14;
  const oy = 0;
  for (let row = 0; row < dv.length && oy + row < H; row++) {
    const line = dv[row]!;
    for (let col = 0; col < line.length && ox + col < W; col++) {
      if (line[col] === "x") set(ox + col, oy + row, 1);
    }
  }
  return g;
})();

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Shared particle / attractor brightness field (animated). */
export function sampleField(x: number, y: number, t: number): number {
  const ax = 14 + Math.sin(t * 0.85) * 9;
  const ay = 5 + Math.cos(t * 0.62) * 3.5;
  const bx = 38 + Math.cos(t * 0.48) * 7;
  const by = 6 + Math.sin(t * 0.93) * 4;
  const d1 = 1 / (1 + Math.hypot(x - ax, y - ay) * 0.55);
  const d2 = 1 / (1 + Math.hypot(x - bx, y - by) * 0.55);
  const wave =
    Math.sin(x * 0.42 + t * 1.1) * Math.cos(y * 0.38 - t * 0.75) * 0.18;
  return clamp01(d1 * 0.38 + d2 * 0.38 + wave + 0.18);
}

function pickChar(brightness: number): string {
  const i = Math.round(brightness * (DENSITY_RAMP.length - 1));
  return DENSITY_RAMP[Math.max(0, Math.min(DENSITY_RAMP.length - 1, i))]!;
}

function colorize(char: string, brightness: number, mask: number): string {
  if (mask < 0.15) return chalk.gray(char);
  if (brightness > 0.72) return chalk.white.bold(char);
  if (brightness > 0.48) return chalk.cyan(char);
  if (brightness > 0.28) return chalk.blue(char);
  return chalk.hex("#1e3a5f")(char);
}

export function renderLogoFrame(t: number): string[] {
  const lines: string[] = [];
  for (let y = 0; y < H; y++) {
    let line = "  ";
    for (let x = 0; x < W; x++) {
      const mask = MASK[y]![x]!;
      const field = sampleField(x, y, t);
      const brightness = mask > 0 ? clamp01(field * 0.55 + mask * 0.55) : field * 0.22;
      const ch = mask > 0 ? pickChar(brightness) : pickChar(brightness * 0.65);
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
    `  ${"─".repeat(48)}\n  typographic field · inspired by ${chalk.cyan("pretext")} · ${chalk.white("DotVault")} ${chalk.gray("dv")}\n`,
  );
  for (const line of art) console.log(line);
  console.log(footer);
  return art.length + 2;
}

/** Animate logo frames in-place (TTY only). */
export async function playLogoAnimation(frames = 12): Promise<void> {
  if (!supportsVisual()) {
    printLogoBlock(0);
    return;
  }

  const hide = "\x1b[?25l";
  const show = "\x1b[?25h";
  process.stdout.write(hide);

  try {
    let lineCount = printLogoBlock(0);
    await sleep(75);

    for (let f = 1; f < frames; f++) {
      const t = f * 0.42;
      process.stdout.write(`\x1b[${lineCount}A`);
      const art = renderLogoFrame(t);
      const footer = chalk.gray(
        `  ${"─".repeat(48)}\n  typographic field · inspired by ${chalk.cyan("pretext")} · ${chalk.white("DotVault")} ${chalk.gray("dv")}\n`,
      );
      for (const line of art) {
        process.stdout.write("\x1b[2K" + line + "\n");
      }
      process.stdout.write("\x1b[2K" + footer);
      lineCount = art.length + 2;
      await sleep(75);
    }
    process.stdout.write(show);
    console.log();
  } catch (err) {
    process.stdout.write(show);
    throw err;
  }
}

/** Single static frame (no animation). */
export function printLogoStatic(): void {
  printLogoBlock(0);
  console.log();
}
