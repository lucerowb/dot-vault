import { describe, expect, it } from "vitest";

import { formatRetryCountdown } from "@/lib/rate-limit-utils";

describe("formatRetryCountdown", () => {
  it("formats minutes and seconds", () => {
    const now = 1_000_000;
    expect(formatRetryCountdown(now + 125_000, now)).toBe("2m 5s");
  });

  it("returns now when elapsed", () => {
    expect(formatRetryCountdown(500, 1_000)).toBe("now");
  });
});
