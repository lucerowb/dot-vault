import { describe, expect, it } from "vitest";

import {
  countEnvDiffChanges,
  diffEnvContents,
  maskEnvValue,
  parseEnvPairs,
} from "@/lib/env-diff";

describe("parseEnvPairs", () => {
  it("parses simple key/value pairs", () => {
    const pairs = parseEnvPairs("A=1\nB=2");
    expect(pairs.get("A")).toBe("1");
    expect(pairs.get("B")).toBe("2");
  });

  it("skips comments and blank lines", () => {
    const pairs = parseEnvPairs("# comment\n\nA=1\n   \n# another");
    expect([...pairs.keys()]).toEqual(["A"]);
  });

  it("strips surrounding quotes", () => {
    const pairs = parseEnvPairs('A="hello world"\nB=\'single\'');
    expect(pairs.get("A")).toBe("hello world");
    expect(pairs.get("B")).toBe("single");
  });

  it("keeps inline # as part of the value (consistent with storage)", () => {
    const pairs = parseEnvPairs("PASSWORD=p@ss#w0rd");
    expect(pairs.get("PASSWORD")).toBe("p@ss#w0rd");
  });

  let map: Map<string, string>;
  it("last definition wins for duplicate keys", () => {
    map = parseEnvPairs("A=1\nA=2");
    expect(map.get("A")).toBe("2");
  });

  it("values may contain equals signs", () => {
    const pairs = parseEnvPairs("CONNECTION=user=admin;pw=x");
    expect(pairs.get("CONNECTION")).toBe("user=admin;pw=x");
  });
});

describe("maskEnvValue", () => {
  it("masks empty values", () => {
    expect(maskEnvValue("")).toBe("(empty)");
  });

  it("fully masks short values", () => {
    expect(maskEnvValue("abc")).toBe("***");
  });

  it("shows only edges for medium values", () => {
    expect(maskEnvValue("abcdefgh")).toBe("a***h");
  });

  it("shows first/last four for long values", () => {
    expect(maskEnvValue("sk_live_abcdef1234567890")).toBe(
      "sk_l…7890",
    );
  });
});

describe("diffEnvContents", () => {
  it("detects added, removed, changed and unchanged keys", () => {
    const from = "KEEP=1\nCHANGED=old\nGONE=bye";
    const to = "KEEP=1\nCHANGED=new\nNEW=hi";

    const diff = diffEnvContents(from, to);

    expect(diff.added.map((e) => e.key)).toEqual(["NEW"]);
    expect(diff.removed.map((e) => e.key)).toEqual(["GONE"]);
    expect(diff.changed).toEqual([
      { key: "CHANGED", from: "old", to: "new", status: "changed" },
    ]);
    expect(diff.unchangedKeys).toEqual(["KEEP"]);
    expect(countEnvDiffChanges(diff)).toBe(3);
  });

  it("treats identical content as no changes", () => {
    const content = "A=1\nB=2";
    const diff = diffEnvContents(content, content);
    expect(countEnvDiffChanges(diff)).toBe(0);
    expect(diff.unchangedKeys).toEqual(["A", "B"]);
  });

  it("sorts entries alphabetically", () => {
    const diff = diffEnvContents("Z=1\nA=2", "Y=3\nB=4");
    expect(diff.removed.map((e) => e.key)).toEqual(["A", "Z"]);
    expect(diff.added.map((e) => e.key)).toEqual(["B", "Y"]);
  });

  it("handles quoted multi-line values", () => {
    const from = 'CERT="line1';
    const to = 'CERT="line1';
    const diff = diffEnvContents(`${from}\nstill-line1"`, `${to}\nchanged"`);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]?.key).toBe("CERT");
  });

  it("does not leak values into unchanged comparison when equal", () => {
    const diff = diffEnvContents('TOKEN="abc"', "TOKEN=abc");
    expect(diff.unchangedKeys).toEqual(["TOKEN"]);
    expect(countEnvDiffChanges(diff)).toBe(0);
  });
});
