import { describe, expect, it } from "vitest";

import { summarizeAccessLog } from "@/lib/vault-access";

describe("summarizeAccessLog", () => {
  it("reports not opened when empty", () => {
    expect(summarizeAccessLog([]).safetyHint).toBe("not_opened");
    expect(summarizeAccessLog([]).openCount).toBe(0);
  });

  it("flags multiple IPs", () => {
    const summary = summarizeAccessLog([
      { at: 1, ip: "1.2.3.4", userAgent: null, referer: null },
      { at: 2, ip: "5.6.7.8", userAgent: null, referer: null },
    ]);
    expect(summary.safetyHint).toBe("multiple_ips");
    expect(summary.uniqueIps).toBe(2);
  });
});
