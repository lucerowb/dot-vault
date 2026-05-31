"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { EnvQuickSharesPanel } from "@/components/EnvQuickSharesPanel";
import { VersionHistory } from "@/components/VersionHistory";
import { apiGet, getErrorMessage } from "@/lib/api-client";
import { toastCopied, toastError, toastSuccess } from "@/lib/toast";
import { queryKeys } from "@/lib/query-keys";
import {
  useDeleteEnv,
  useEnvContent,
  useProject,
  useProjectEnvs,
} from "@/hooks/use-projects";
import type { EnvContent } from "@/types/project.types";

type Tab = "content" | "shares" | "versions";

export default function EnvDetailPage() {
  const params = useParams<{ projectId: string; envId: string }>();
  const projectId = params.projectId;
  const envId = params.envId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab =
    tabParam === "shares" || tabParam === "versions" ? tabParam : "content";
  const [actionError, setActionError] = useState<string | null>(null);

  function selectTab(next: Tab) {
    const base = `/dashboard/projects/${projectId}/envs/${envId}`;
    if (next === "content") {
      router.replace(base);
    } else {
      router.replace(`${base}?tab=${next}`);
    }
  }

  const queryClient = useQueryClient();
  const projectQuery = useProject(projectId);
  const envsQuery = useProjectEnvs(projectId);
  const envQuery = useEnvContent(projectId, envId, true);
  const deleteEnvMutation = useDeleteEnv(projectId);

  const envMeta = useMemo(
    () => envsQuery.data?.find((e) => e.id === envId),
    [envsQuery.data, envId],
  );
  const envLabel = envMeta?.label ?? envQuery.data?.label ?? "Environment";

  const project = projectQuery.data;
  const myRole = project?.myRole;
  const canEditEnvs = myRole === "owner" || myRole === "editor";

  const envContent = envQuery.data?.content;

  const loadPlaintext = useCallback(async () => {
    if (envContent) return envContent;
    const data = await queryClient.fetchQuery({
      queryKey: queryKeys.projects.env(projectId, envId),
      queryFn: () =>
        apiGet<EnvContent>(`/api/projects/${projectId}/envs/${envId}`),
    });
    return data.content;
  }, [envContent, queryClient, projectId, envId]);

  async function copyContent() {
    const text = envQuery.data?.content;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toastCopied("Environment content");
  }

  async function deleteEnv() {
    if (!confirm(`Delete env "${envLabel}"?`)) return;
    setActionError(null);
    try {
      await deleteEnvMutation.mutateAsync(envId);
      toastSuccess(`Deleted "${envLabel}"`);
      router.push(`/dashboard/projects/${projectId}`);
    } catch {
      const msg = "Could not delete env.";
      setActionError(msg);
      toastError(msg);
    }
  }

  if (projectQuery.isPending || envsQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (!envMeta && envsQuery.isSuccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-700 dark:text-red-400">Environment not found.</p>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="mt-4 inline-block text-blue-700 dark:text-blue-400"
        >
          ← Back to project
        </Link>
      </div>
    );
  }

  const loadError =
    projectQuery.error != null
      ? getErrorMessage(projectQuery.error, "Project not found.")
      : envQuery.error != null
        ? getErrorMessage(envQuery.error, "Could not load env.")
        : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="text-sm text-blue-700 hover:underline dark:text-blue-400"
      >
        ← {project?.name ?? "Project"}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {envLabel}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Stored environment · quick share & version history
          </p>
        </div>
        {canEditEnvs ? (
          <button
            type="button"
            onClick={() => void deleteEnv()}
            className="text-sm text-red-700 hover:underline dark:text-red-400"
          >
            Delete env
          </button>
        ) : null}
      </div>

      {(actionError ?? loadError) ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
          {actionError ?? loadError}
        </p>
      ) : null}

      <nav
        className="mt-8 -mb-px flex gap-6 border-b border-zinc-200 dark:border-zinc-700"
        aria-label="Environment sections"
      >
        {(
          [
            { id: "content" as const, label: "Content" },
            { id: "shares" as const, label: "Quick shares" },
            { id: "versions" as const, label: "Version history" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={[
              "whitespace-nowrap border-b-2 py-3 text-sm font-medium transition",
              tab === t.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "content" && (
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Plaintext (decrypted server-side for this UI)
              </h2>
              <button
                type="button"
                disabled={!envQuery.data?.content}
                onClick={() => void copyContent()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
              >
                Copy all
              </button>
            </div>
            {envQuery.isPending ? (
              <p className="p-4 text-sm text-zinc-500">Loading…</p>
            ) : (
              <pre className="max-h-[min(32rem,60vh)] overflow-auto p-4 text-left text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                {envQuery.data?.content ?? ""}
              </pre>
            )}
          </section>
        )}

        {tab === "shares" && (
          <EnvQuickSharesPanel
            projectId={projectId}
            envId={envId}
            envLabel={envLabel}
            loadPlaintext={loadPlaintext}
          />
        )}

        {tab === "versions" && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
            <VersionHistory
              projectId={projectId}
              envId={envId}
              envLabel={envLabel}
            />
          </section>
        )}
      </div>
    </div>
  );
}
