import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptBlob, encryptBlob } from "@/lib/at-rest-crypto";

describe("at-rest-crypto", () => {
  const prev = process.env.STORAGE_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.STORAGE_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  });

  afterAll(() => {
    process.env.STORAGE_ENCRYPTION_KEY = prev;
  });

  it("round-trips plaintext", () => {
    const msg = "A=1\nB=secret\n";
    const { iv, ciphertext } = encryptBlob(msg);
    expect(decryptBlob(iv, ciphertext)).toBe(msg);
  });
});
