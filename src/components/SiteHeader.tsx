"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold text-zinc-900">
          DotVault
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          <Link href="/quick-share" className="hover:text-zinc-900">
            Quick share
          </Link>
          <Link href="/dashboard" className="hover:text-zinc-900">
            Cloud vault
          </Link>
          {isPending ? (
            <span className="text-zinc-400">…</span>
          ) : session?.user ? (
            <>
              <span className="hidden text-zinc-500 sm:inline">
                {session.user.email}
              </span>
              <button
                type="button"
                className="text-blue-700 hover:text-blue-900"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-blue-700 hover:text-blue-900">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
