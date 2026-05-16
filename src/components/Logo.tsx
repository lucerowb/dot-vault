"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";

type MarkProps = {
  className?: string;
  priority?: boolean;
};

/**
 * After mount, reflects `document.documentElement.classList.contains("dark")`.
 * Before mount, always `false` so the first client render matches SSR (light
 * assets) and we never hydrate the dark wordmark on a light page.
 */
function useHtmlDarkAfterMount() {
  const [dark, setDark] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", sync);
    };
  }, []);

  return dark === null ? false : dark;
}

/** Illustration-only mark (cloud + vault). */
export function LogoMark({ className, priority }: MarkProps) {
  const dark = useHtmlDarkAfterMount();
  const src = dark ? "/brand/logo-mark-dark.png" : "/brand/logo-mark.png";
  return (
    <span
      className={["relative inline-block shrink-0", className].filter(Boolean).join(" ")}
    >
      <Image
        src={src}
        alt=""
        fill
        className="object-contain"
        sizes="96px"
        priority={priority}
      />
    </span>
  );
}

type WordmarkProps = {
  className?: string;
  priority?: boolean;
};

/** Text wordmark. */
export function LogoWordmark({ className, priority }: WordmarkProps) {
  const dark = useHtmlDarkAfterMount();
  const src = dark ? "/brand/logo-wordmark-dark.png" : "/brand/logo-wordmark.png";
  return (
    <Image
      src={src}
      alt="DotVault"
      width={2048}
      height={568}
      sizes="(max-width: 640px) 85vw, 320px"
      className={className}
      priority={priority}
    />
  );
}

/** Header: mark + wordmark. */
export function LogoHeaderLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-lg outline-none ring-blue-500/40 focus-visible:ring-2"
    >
      <LogoMark className="h-9 w-9 shrink-0" priority />
      <LogoWordmark
        className="h-7 w-auto max-h-8 max-w-[min(160px,42vw)] object-contain object-left"
        priority
      />
    </Link>
  );
}
