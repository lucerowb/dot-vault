/**
 * DotVault logo mask (from public/brand/logo-mark.png).
 * `#` = logo shape, `.` = background. Used by pretext-visual.ts.
 */
export const LOGO_MASK_W = 48;
export const LOGO_MASK_H = 14;

/** Row strings: cloud outline + motion lines (left) + vault circle (center-right). */
export const LOGO_MASK_ROWS: string[] = [
  "..............,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "...........,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "......---,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ".....-==--,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "....-====-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "...-======-,,,,,,,,,##########,,,,,,,,,,,,,,,,,",
  "..-========,,,,,,,##############,,,,,,,,,,,,,,,,",
  ".-=========-,,,,,######,,,,,######,,,,,,,,,,,,,,",
  ".===========,,,,,####,,,##,,,####,,,,,,,,,,,,,",
  ".===========,,,,,####,,,##,,,####,,,,,,,,,,,,,",
  ".===========,,,,,####,,,##,,,####,,,,,,,,,,,,,",
  ".-=========-,,,,,######,,,,,######,,,,,,,,,,,,,,",
  "..-========,,,,,,,##############,,,,,,,,,,,,,,",
  "...-======-,,,,,,,,,##########,,,,,,,,,,,,,,,,,",
];

/** 0–1 mask grid derived from LOGO_MASK_ROWS. */
export function buildLogoMask(): number[][] {
  const grid: number[][] = [];
  for (const row of LOGO_MASK_ROWS) {
    const line: number[] = [];
    for (let x = 0; x < LOGO_MASK_W; x++) {
      const ch = row[x] ?? ".";
      if (ch === "#") line.push(1);
      else if (ch === ",") line.push(0.85);
      else if (ch === "-") line.push(0.55);
      else if (ch === "=") line.push(0.7);
      else line.push(0);
    }
    grid.push(line);
  }
  return grid;
}
