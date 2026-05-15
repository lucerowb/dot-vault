function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateVaultToken(): string {
  return `tk_${randomHex(16)}`;
}

export function generateDeleteToken(): string {
  return `dt_${randomHex(32)}`;
}
