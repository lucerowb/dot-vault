// Environment diff engine — compares two parsed .env payloads at the key level.
// Pure functions shared by the API (label vs label) and tooling.

import { parseEnvFile } from "@/lib/import-export";

export interface EnvPair {
  key: string;
  value: string;
}

export interface AddedEntry extends EnvPair {
  status: "added";
}

export interface RemovedEntry extends EnvPair {
  status: "removed";
}

export interface ChangedEntry {
  key: string;
  from: string;
  to: string;
  status: "changed";
}

export type DiffEntry = AddedEntry | RemovedEntry | ChangedEntry;

export interface EnvDiffResult {
  added: AddedEntry[];
  removed: RemovedEntry[];
  changed: ChangedEntry[];
  unchangedKeys: string[];
}

/** Mask a value for safe display: never reveal full plaintext. */
export function maskEnvValue(value: string): string {
  if (value.length === 0) return "(empty)";
  if (value.length <= 4) return "*".repeat(value.length);
  if (value.length <= 12) return `${value.slice(0, 1)}***${value.slice(-1)}`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/**
 * Parse .env content into an ordered key → value map.
 * Later definitions win; comments and blank lines are ignored.
 * Values keep quotes stripped, matching how DotVault stores content
 * everywhere else (inline `#` stays part of the value).
 */
export function parseEnvPairs(content: string): Map<string, string> {
  const pairs = new Map<string, string>();
  const { secrets } = parseEnvFile(content);

  for (const { key, value } of secrets) {
    if (!key) continue;
    pairs.set(key, value);
  }

  return pairs;
}

/**
 * Compute a key-level diff between two .env payloads.
 * `from` is the reference; entries present only in `to` are "added",
 * only in `from` are "removed", and value mismatches are "changed".
 */
export function diffEnvContents(
  fromContent: string,
  toContent: string,
): EnvDiffResult {
  const from = parseEnvPairs(fromContent);
  const to = parseEnvPairs(toContent);

  const added: AddedEntry[] = [];
  const removed: RemovedEntry[] = [];
  const changed: ChangedEntry[] = [];
  const unchangedKeys: string[] = [];

  for (const [key, value] of from) {
    if (!to.has(key)) {
      removed.push({ key, value, status: "removed" });
    } else if (to.get(key) !== value) {
      changed.push({
        key,
        from: value,
        to: to.get(key)!,
        status: "changed",
      });
    } else {
      unchangedKeys.push(key);
    }
  }

  for (const [key, value] of to) {
    if (!from.has(key)) {
      added.push({ key, value, status: "added" });
    }
  }

  added.sort((a, b) => a.key.localeCompare(b.key));
  removed.sort((a, b) => a.key.localeCompare(b.key));
  changed.sort((a, b) => a.key.localeCompare(b.key));
  unchangedKeys.sort((a, b) => a.localeCompare(b));

  return { added, removed, changed, unchangedKeys };
}

export function countEnvDiffChanges(diff: EnvDiffResult): number {
  return diff.added.length + diff.removed.length + diff.changed.length;
}
