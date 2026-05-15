import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getMasterKey(): Buffer {
  const raw = process.env.STORAGE_ENCRYPTION_KEY;
  if (!raw || raw.trim().length < 32) {
    throw new Error(
      "STORAGE_ENCRYPTION_KEY must be set to a Base64-encoded 32-byte key (openssl rand -base64 32)",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "STORAGE_ENCRYPTION_KEY Base64 payload must decode to 32 bytes",
    );
  }
  return key;
}

export function encryptBlob(plaintext: string): {
  iv: string;
  ciphertext: string;
} {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
  };
}

export function decryptBlob(
  ivB64: string,
  ciphertextWithTagB64: string,
): string {
  const key = getMasterKey();
  const iv = Buffer.from(ivB64, "base64");
  const combined = Buffer.from(ciphertextWithTagB64, "base64");
  if (combined.length < 16) {
    throw new Error("Corrupt ciphertext");
  }
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
