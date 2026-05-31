"use client";

import { useEffect } from "react";

/** Set when leaving the app for `/docs/` via DocsLink (optional signal). */
export const DOCS_VISIT_STORAGE_KEY = "dotvault-visited-docs";

const RELOAD_GUARD = "dotvault-home-history-reload";

function isBackForwardNavigation() {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return nav?.type === "back_forward";
}

/**
 * Browser back to `/` restores a frozen React tree from bfcache (Framer Motion
 * stuck at opacity: 0). Effects do not re-run on restore — reload on `pageshow`.
 */
export function useReloadHomeAfterDocsBack() {
  useEffect(() => {
    sessionStorage.removeItem(RELOAD_GUARD);

    const onPageShow = (event: PageTransitionEvent) => {
      if (window.location.pathname !== "/") return;

      const historyBack = event.persisted || isBackForwardNavigation();
      if (!historyBack) return;

      if (sessionStorage.getItem(RELOAD_GUARD) === "1") return;

      sessionStorage.removeItem(DOCS_VISIT_STORAGE_KEY);
      sessionStorage.setItem(RELOAD_GUARD, "1");
      window.location.reload();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
}
