import { describe, expect, it } from "vitest";

import { parseVaultRecord } from "@/lib/vault-record-parse";
import type { VaultRecord } from "@/types/vault.types";

const sample: VaultRecord = {
  iv: "AAAAAAAAAAAAAAAA",
  ciphertext: "Ym9keQ==",
  createdAt: 1_700_000_000,
  ttl: 300,
  oneTime: false,
  deleteToken: "dt_test",
};

describe("parseVaultRecord", () => {
  it("parses JSON string payloads", () => {
    expect(parseVaultRecord(JSON.stringify(sample))).toEqual(sample);
  });

  it("accepts deserialized objects from Upstash", () => {
    expect(parseVaultRecord(sample)).toEqual(sample);
  });

  it("returns null for invalid values", () => {
    expect(parseVaultRecord(null)).toBeNull();
    expect(parseVaultRecord("{bad json")).toBeNull();
    expect(parseVaultRecord({ iv: "x" })).toBeNull();
  });
});
