/**
 * Normalize light/dark brand PNGs to identical canvas sizes so Next/Image
 * scales them the same in both themes. Overwrites public/brand/*.png
 * and refreshes src/app/icon.png + apple-icon.png from the light mark.
 *
 * Run: node scripts/normalize-brand-logos.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brand = path.join(root, "public", "brand");

/** Resize to `width`, preserve aspect; return buffer + pixel dimensions. */
async function resizeToWidth(inputPath, width) {
  const buf = await sharp(inputPath)
    .ensureAlpha()
    .resize({
      width,
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return {
    buf,
    width: meta.width ?? width,
    height: meta.height ?? 1,
  };
}

async function letterboxToCanvas(buf, canvasW, canvasH) {
  const meta = await sharp(buf).metadata();
  const iw = meta.width ?? canvasW;
  const ih = meta.height ?? canvasH;
  const left = Math.floor((canvasW - iw) / 2);
  const top = Math.floor((canvasH - ih) / 2);
  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: buf, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/**
 * Remove baked-in black / near-black artboards from light UI wordmarks.
 * Keeps navy letterforms (e.g. high blue channel) and bright pixels.
 */
async function keyBlackMatteToTransparent(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const sum = r + g + b;
    // Near-black artboard only; keeps navy/teal and dark gradient legs.
    if (sum <= 32 && r <= 12 && g <= 12 && b <= 14) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: info })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/**
 * @param {string} lightPath
 * @param {string} darkPath
 * @param {number} targetWidth
 */
async function normalizePair(lightPath, darkPath, targetWidth) {
  const a = await resizeToWidth(lightPath, targetWidth);
  const b = await resizeToWidth(darkPath, targetWidth);
  const canvasH = Math.max(a.height, b.height);
  let lightOut = await letterboxToCanvas(a.buf, targetWidth, canvasH);
  const darkOut = await letterboxToCanvas(b.buf, targetWidth, canvasH);
  if (path.basename(lightPath) === "logo-wordmark.png") {
    lightOut = await keyBlackMatteToTransparent(lightOut);
  }
  await fs.writeFile(lightPath, lightOut);
  await fs.writeFile(darkPath, darkOut);
  console.log(
    path.basename(lightPath),
    "+",
    path.basename(darkPath),
    "→",
    `${targetWidth}×${canvasH}`
  );
}

async function writeAppIconsFromMark(markLightPath) {
  const base = await sharp(markLightPath)
    .ensureAlpha()
    .resize({
      width: 512,
      height: 512,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const app = path.join(root, "src", "app");
  await fs.writeFile(path.join(app, "icon.png"), base);
  const apple = await sharp(markLightPath)
    .ensureAlpha()
    .resize({
      width: 180,
      height: 180,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(path.join(app, "apple-icon.png"), apple);
  console.log("icon.png → 512×512, apple-icon.png → 180×180 (from light mark)");
}

async function main() {
  await normalizePair(
    path.join(brand, "logo-wordmark.png"),
    path.join(brand, "logo-wordmark-dark.png"),
    2048
  );
  await normalizePair(
    path.join(brand, "logo-mark.png"),
    path.join(brand, "logo-mark-dark.png"),
    1024
  );
  await writeAppIconsFromMark(path.join(brand, "logo-mark.png"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
