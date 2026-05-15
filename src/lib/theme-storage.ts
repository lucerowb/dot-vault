export const THEME_STORAGE_KEY = "dotvault-theme";

export type ThemePreference = "light" | "dark" | "system";

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function writeThemePreference(value: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function resolveDarkClass(pref: ThemePreference): boolean {
  if (typeof window === "undefined") return false;
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
