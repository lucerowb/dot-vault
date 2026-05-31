"use client";

import { useEffect, useState } from "react";

/** Ticks every second for countdown / rate-limit UI (avoids Date.now() during render). */
export function useNowMs(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
