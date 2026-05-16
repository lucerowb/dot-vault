"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  myRole: "owner" | "editor" | "viewer";
};

const field =
  "min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/projects", { cache: "no-store" });
    const json = (await res.json()) as {
      success?: boolean;
      data?: ProjectRow[];
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data) {
      setError(json.error?.message ?? "Could not load projects.");
      setProjects([]);
      return;
    }
    setProjects(json.data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { id: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message ?? "Could not create project.");
        return;
      }
      setName("");
      router.push(`/dashboard/projects/${json.data.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Projects
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Upload and manage `.env`-style payloads per project. Invite teammates by
        email; editors can change blobs, viewers can read and quick-share.
      </p>

      <form
        onSubmit={(e) => void createProject(e)}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90 sm:flex-row"
      >
        <input
          placeholder="Project name e.g. web-api"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          New project
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-10 space-y-3">
        {projects === null ? (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</li>
        ) : projects.length === 0 ? (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            No projects yet.
          </li>
        ) : (
          projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/projects/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 dark:border-zinc-700 dark:bg-zinc-900/90 dark:hover:border-blue-700/50"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {p.name}
                </span>
                <span className="flex items-center gap-2">
                  {p.myRole !== "owner" ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                      Shared · {p.myRole}
                    </span>
                  ) : null}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {p.slug}
                  </span>
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
