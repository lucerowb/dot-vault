"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/api-client";
import {
  useAcceptInvitation,
  useInvitationPreview,
} from "@/hooks/use-projects";

function normEmail(s: string) {
  return s.trim().toLowerCase();
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const previewQuery = useInvitationPreview(token);
  const acceptInvitation = useAcceptInvitation();
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const preview = previewQuery.data ?? null;
  const loadError =
    previewQuery.error != null
      ? getErrorMessage(previewQuery.error, "Invalid or expired invitation.")
      : null;

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
    try {
      const result = await acceptInvitation.mutateAsync(token);
      router.push(`/dashboard/projects/${result.projectId}`);
      router.refresh();
    } catch (err) {
      setAcceptError(getErrorMessage(err, "Could not accept invitation."));
    }
  }

  if (loadError && !preview) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Invitation
        </h1>
        <p className="mt-3 text-sm text-red-700 dark:text-red-400">
          {loadError}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-blue-700 hover:underline dark:text-blue-400"
        >
          ← Cloud vault
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Project invitation
      </h1>
      {preview ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          You have been invited to{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {preview.projectName}
          </span>{" "}
          as{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {preview.role}
          </span>
          .
        </p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Loading…
        </p>
      )}

      {sessionPending ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Checking session…
        </p>
      ) : !session?.user ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sign in (or create an account) with{" "}
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {preview?.email}
            </span>{" "}
            to accept.
          </p>
          <Link
            href={loginHref}
            className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Sign in to accept
          </Link>
          <Link
            href={registerHref}
            className="block w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Create account
          </Link>
        </div>
      ) : preview && !emailMatches ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <p>
            You are signed in as{" "}
            <span className="font-mono">{session.user.email}</span>, but this
            invite is for <span className="font-mono">{preview.email}</span>.
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-blue-800 underline dark:text-blue-300"
            onClick={() => void authClient.signOut()}
          >
            Sign out and use the invited account
          </button>
        </div>
      ) : preview && emailMatches ? (
        <div className="mt-8 space-y-4">
          {acceptError ? (
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {acceptError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={acceptInvitation.isPending}
            onClick={() => void accept()}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {acceptInvitation.isPending
              ? "Joining…"
              : "Accept and open project"}
          </button>
        </div>
      ) : null}

      <Link
        href="/dashboard"
        className="mt-8 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to projects
      </Link>
    </div>
  );
}
