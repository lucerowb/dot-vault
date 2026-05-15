import { describe, expect, it } from "vitest";

import {
  buildShareFragment,
  decryptUtf8,
  encryptUtf8,
  generateAesGcmKey,
  importKeyFromFragment,
} from "@/lib/crypto";
import { parseFragment } from "@/lib/fragment";

describe("crypto", () => {
  it("encrypts and decrypts UTF-8 text", async () => {
    const key = await generateAesGcmKey();
    const message = "FOO=bar\nBAZ=qux\n";
    const { iv, ciphertext } = await encryptUtf8(message, key);
    const plain = await decryptUtf8(iv, ciphertext, key);
    expect(plain).toBe(message);
  });

  it("builds v1 share fragment and imports key", async () => {
    const key = await generateAesGcmKey();
    const frag = await buildShareFragment(key);
    expect(frag.startsWith("v1.")).toBe(true);
    const parsed = parseFragment(frag);
    expect(parsed).not.toBeNull();
    const imported = await importKeyFromFragment(parsed!);
    const { iv, ciphertext } = await encryptUtf8("secret", key);
    const plain = await decryptUtf8(iv, ciphertext, imported);
    expect(plain).toBe("secret");
  });

  it("wraps key with passphrase (v2)", async () => {
    const key = await generateAesGcmKey();
    const frag = await buildShareFragment(key, { passphrase: "correct horse" });
    expect(frag.startsWith("v2.")).toBe(true);
    const parsed = parseFragment(frag);
    expect(parsed?.version).toBe(2);
    if (parsed?.version !== 2) return;
    const unwrapped = await importKeyFromFragment(parsed, "correct horse");
    const { iv, ciphertext } = await encryptUtf8("payload", key);
    const plain = await decryptUtf8(iv, ciphertext, unwrapped);
    expect(plain).toBe("payload");
  });
});
