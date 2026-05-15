"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Could not sign in.");
        return;
      }
      let next = "/dashboard";
      if (typeof window !== "undefined") {
        const raw = new URLSearchParams(window.location.search).get("next");
        if (raw?.startsWith("/") && !raw.startsWith("//")) next = raw;
      }
      router.push(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Access your cloud-stored projects and env files.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-zinc-500">Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        No account?{" "}
        <Link href="/register" className="font-medium text-blue-700 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
