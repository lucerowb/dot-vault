"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { LogoHeaderLink } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <LogoHeaderLink />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <nav className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 sm:gap-4">
            <Link
              href="/quick-share"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Quick share
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Cloud vault
            </Link>
            {isPending ? (
              <span className="text-zinc-400">…</span>
            ) : session?.user ? (
              <>
                <span className="hidden text-zinc-500 dark:text-zinc-500 sm:inline">
                  {session.user.email}
                </span>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
