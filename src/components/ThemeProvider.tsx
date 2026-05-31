"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getServerThemePreference,
  notifyThemePreferenceChange,
  readThemePreference,
  resolveDarkClass,
  subscribeThemePreference,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/theme-storage";

type Ctx = {
  preference: ThemePreference;
  setPreference: (v: ThemePreference) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function applyClass(pref: ThemePreference) {
  const dark = resolveDarkClass(pref);
  document.documentElement.classList.toggle("dark", dark);
  return dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    getServerThemePreference,
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    applyClass(preference);
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePreference() === "system") {
        applyClass("system");
        notifyThemePreferenceChange();
        setTick((n) => n + 1);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((v: ThemePreference) => {
    writeThemePreference(v);
    applyClass(v);
    notifyThemePreferenceChange();
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
