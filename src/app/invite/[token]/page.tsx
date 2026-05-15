"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

function normEmail(s: string) {
  return s.trim().toLowerCase();
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [preview, setPreview] = useState<{
    projectName: string;
    email: string;
    role: string;
    expiresAt: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(
      `/api/projects/invitations/by-token?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        projectName: string;
        email: string;
        role: string;
        expiresAt: number;
      };
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data) {
      setLoadError(json.error?.message ?? "Invalid or expired invitation.");
      setPreview(null);
      return;
    }
    setPreview(json.data);
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => void loadPreview());
  }, [loadPreview]);

  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
  const registerHref = `/register?next=${encodeURIComponent(`/invite/${token}`)}`;

  const invitedEmail = preview ? normEmail(preview.email) : "";
  const signedInEmail = session?.user?.email
    ? normEmail(session.user.email)
    : "";
  const emailMatches =
    preview && signedInEmail && signedInEmail === invitedEmail;

  async function accept() {
    setAcceptError(null);
    setAcceptBusy(true);
    try {
      const res = await fetch("/api/projects/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { projectId: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.success || !json.data?.projectId) {
        setAcceptError(json.error?.message ?? "Could not accept invitation.");
        return;
      }
      router.push(`/dashboard/projects/${json.data.projectId}`);
      router.refresh();
    } finally {
      setAcceptBusy(false);
    }
  }

  if (loadError && !preview) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">Invitation</h1>
        <p className="mt-3 text-sm text-red-700">{loadError}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-blue-700 hover:underline"
        >
          ← Cloud vault
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-zinc-900">Project invitation</h1>
      {preview ? (
        <p className="mt-3 text-sm text-zinc-600">
          You have been invited to{" "}
          <span className="font-medium text-zinc-900">{preview.projectName}</span>{" "}
          as <span className="font-medium text-zinc-900">{preview.role}</span>.
        </p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Loading…</p>
      )}

      {sessionPending ? (
        <p className="mt-6 text-sm text-zinc-500">Checking session…</p>
      ) : !session?.user ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-zinc-600">
            Sign in (or create an account) with{" "}
            <span className="font-mono text-zinc-900">{preview?.email}</span> to
            accept.
          </p>
          <Link
            href={loginHref}
            className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in to accept
          </Link>
          <Link
            href={registerHref}
            className="block w-full rounded-xl border border-zinc-200 py-2.5 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Create account
          </Link>
        </div>
      ) : preview && !emailMatches ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p>
            You are signed in as{" "}
            <span className="font-mono">{session.user.email}</span>, but this
            invite is for{" "}
            <span className="font-mono">{preview.email}</span>.
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-blue-800 underline"
            onClick={() => void authClient.signOut()}
          >
            Sign out and use the invited account
          </button>
        </div>
      ) : preview && emailMatches ? (
        <div className="mt-8 space-y-4">
          {acceptError ? (
            <p className="text-sm text-red-700" role="alert">
              {acceptError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={acceptBusy}
            onClick={() => void accept()}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {acceptBusy ? "Joining…" : "Accept and open project"}
          </button>
        </div>
      ) : null}

      <Link
        href="/dashboard"
        className="mt-8 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to projects
      </Link>
    </div>
  );
}
