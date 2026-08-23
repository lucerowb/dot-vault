// Local key-level diff between two .env payloads (used for
// file-vs-label comparisons; label-vs-label uses the server API).

export interface LocalDiffEntry {
  key: string;
  from?: string;
  to?: string;
}

export interface LocalDiffResult {
  added: LocalDiffEntry[];
  removed: LocalDiffEntry[];
  changed: LocalDiffEntry[];
  unchangedCount: number;
}

function parsePairs(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let key = trimmed.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

export function maskValue(value: string): string {
  if (value.length === 0) return "(empty)";
  if (value.length <= 4) return "*".repeat(value.length);
  if (value.length <= 12) return `${value.slice(0, 1)}…${value.slice(-1)}`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function diffLocalContents(
  fromContent: string,
  toContent: string,
): LocalDiffResult {
  const from = parsePairs(fromContent);
  const to = parsePairs(toContent);

  const added: LocalDiffEntry[] = [];
  const removed: LocalDiffEntry[] = [];
  const changed: LocalDiffEntry[] = [];
  let unchangedCount = 0;

  for (const [key, value] of from) {
    const next = to.get(key);
    if (next === undefined) removed.push({ key, from: value });
    else if (next !== value) changed.push({ key, from: value, to: next });
    else unchangedCount++;
  }
  for (const [key, value] of to) {
    if (!from.has(key)) added.push({ key, to: value });
  }

  const byKey = (a: LocalDiffEntry, b: LocalDiffEntry) =>
    a.key.localeCompare(b.key);
  added.sort(byKey);
  removed.sort(byKey);
  changed.sort(byKey);

  return { added, removed, changed, unchangedCount };
}
