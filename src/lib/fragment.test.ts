import { describe, expect, it } from "vitest";

import { base64UrlToBytes, bytesToBase64Url } from "@/lib/base64url";
import { buildFragmentV1, parseFragment } from "@/lib/fragment";

describe("base64url", () => {
  it("round-trips random bytes", () => {
    const input = new Uint8Array(32);
    crypto.getRandomValues(input);
    const enc = bytesToBase64Url(input);
    const out = base64UrlToBytes(enc);
    expect(out).toEqual(input);
  });
});

describe("fragment", () => {
  it("parses v1 fragment", () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const frag = buildFragmentV1(key);
    const parsed = parseFragment(frag);
    expect(parsed?.version).toBe(1);
    if (parsed?.version === 1) {
      expect(parsed.keyMaterial).toEqual(key);
    }
  });
});
