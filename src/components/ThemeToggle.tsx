"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  function cycle() {
    if (preference === "light") setPreference("dark");
    else if (preference === "dark") setPreference("system");
    else setPreference("light");
  }

  const label =
    preference === "light"
      ? "Theme: light (click for dark)"
      : preference === "dark"
        ? "Theme: dark (click for system)"
        : "Theme: system (click for light)";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
    >
      {preference === "light" ? (
        <SunIcon />
      ) : preference === "dark" ? (
        <MoonIcon />
      ) : (
        <SystemIcon />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7H4V6ZM4 13h16v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z"
      />
    </svg>
  );
}
