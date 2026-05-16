import Image from "next/image";
import Link from "next/link";

type MarkProps = {
  className?: string;
  priority?: boolean;
};

/** Illustration-only mark (cloud + vault). */
export function LogoMark({ className, priority }: MarkProps) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={72}
      height={72}
      className={className}
      priority={priority}
    />
  );
}

type WordmarkProps = {
  className?: string;
  priority?: boolean;
};

/** Text wordmark image (DotVault). */
export function LogoWordmark({ className, priority }: WordmarkProps) {
  return (
    <Image
      src="/brand/logo-wordmark.png"
      alt="DotVault"
      width={220}
      height={48}
      className={className}
      priority={priority}
    />
  );
}

/** Header: mark + wordmark; wordmark gets a light lift on dark backgrounds. */
export function LogoHeaderLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-lg outline-none ring-blue-500/40 focus-visible:ring-2"
    >
      <LogoMark className="h-9 w-9 shrink-0" priority />
      <LogoWordmark
        className="h-7 w-auto max-h-8 max-w-[min(160px,42vw)] object-contain object-left dark:brightness-110 dark:contrast-110 dark:hue-rotate-[-4deg]"
        priority
      />
    </Link>
  );
}
