/** Constant-time string compare (length + bytes). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let out = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const ac = i < a.length ? a.charCodeAt(i) : 0;
    const bc = i < b.length ? b.charCodeAt(i) : 0;
    out |= ac ^ bc;
  }
  return out === 0;
}
