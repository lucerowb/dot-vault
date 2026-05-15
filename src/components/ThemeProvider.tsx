"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  readThemePreference,
  resolveDarkClass,
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
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = readThemePreference();
    applyClass(stored);
    return stored;
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (preference === "system") {
        applyClass("system");
        setTick((n) => n + 1);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((v: ThemePreference) => {
    setPreferenceState(v);
    writeThemePreference(v);
    applyClass(v);
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
