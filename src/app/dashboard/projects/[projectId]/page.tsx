"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ShareStoredEnvModal } from "@/components/ShareStoredEnvModal";

type EnvMeta = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
};

type MyRole = "owner" | "editor" | "viewer";

type Project = {
  id: string;
  name: string;
  slug: string;
  myRole?: MyRole;
};

type TeamMember = {
  userId: string;
  email: string;
  name: string;
  role: MyRole;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [envs, setEnvs] = useState<EnvMeta[] | null>(null);
  const [team, setTeam] = useState<{
    myRole: MyRole;
    members: TeamMember[];
    invitations: InvitationRow[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("default");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<{
    label: string;
    content: string;
  } | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteFlash, setInviteFlash] = useState<string | null>(null);

  const myRole = project?.myRole ?? team?.myRole;
  const canEditEnvs = myRole === "owner" || myRole === "editor";
  const isOwner = myRole === "owner";

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: Project;
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data) {
      setError(json.error?.message ?? "Project not found.");
      setProject(null);
      return;
    }
    setProject(json.data);
    setError(null);
  }, [projectId]);

  const loadEnvs = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/envs`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: EnvMeta[];
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data) {
      setEnvs([]);
      return;
    }
    setEnvs(json.data);
  }, [projectId]);

  const loadTeam = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/members`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        myRole: MyRole;
        members: TeamMember[];
        invitations: InvitationRow[];
      };
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data) {
      setTeam(null);
      return;
    }
    setTeam(json.data);
  }, [projectId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadProject();
      void loadEnvs();
      void loadTeam();
    });
  }, [loadProject, loadEnvs, loadTeam]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/envs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), content }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Upload failed.");
        return;
      }
      setContent("");
      void loadEnvs();
    } finally {
      setBusy(false);
    }
  }

  async function deleteEnv(id: string) {
    if (!confirm("Delete this env blob?")) return;
    const res = await fetch(`/api/projects/${projectId}/envs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      setError("Could not delete.");
      return;
    }
    void loadEnvs();
  }

  async function openEnv(id: string, labelName: string) {
    const res = await fetch(`/api/projects/${projectId}/envs/${id}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { content: string };
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data) {
      setError(json.error?.message ?? "Could not load env.");
      return;
    }
    setViewing({ label: labelName, content: json.data.content });
  }

  async function deleteProject() {
    if (!confirm("Delete this project and all env files?")) return;
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      setError("Could not delete project.");
      return;
    }
    router.push("/dashboard");
  }

  async function copyViewing() {
    if (!viewing) return;
    await navigator.clipboard.writeText(viewing.content);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteFlash(null);
    setInviteBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole,
          }),
        }
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: { acceptUrl?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Invite failed.");
        return;
      }
      setInviteEmail("");
      if (json.data?.acceptUrl) {
        await navigator.clipboard.writeText(json.data.acceptUrl);
        setInviteFlash("Invite created. Accept link copied to clipboard.");
      } else {
        setInviteFlash("Invite created.");
      }
      void loadTeam();
    } finally {
      setInviteBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    const res = await fetch(
      `/api/projects/${projectId}/invitations/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setError("Could not revoke invite.");
      return;
    }
    void loadTeam();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this collaborator?")) return;
    const res = await fetch(
      `/api/projects/${projectId}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    if (!res.ok && res.status !== 204) {
      setError("Could not remove member.");
      return;
    }
    void loadTeam();
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-700">{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-700">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-800"
          >
            ← Projects
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {project?.name ?? "…"}
            </h1>
            {myRole ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-600">
                {myRole}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-500">{project?.slug}</p>
        </div>
        {isOwner ? (
          <button
            type="button"
            onClick={() => void deleteProject()}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-800 hover:bg-red-50"
          >
            Delete project
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700">{error}</p>
      ) : null}

      {team ? (
        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Team</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Owner can invite by email. Invited users sign in with that email and
            open the accept link.
          </p>

          {isOwner ? (
            <form
              onSubmit={(e) => void sendInvite(e)}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="min-w-[200px] flex-1">
                <label className="text-xs text-zinc-500">Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "editor" | "viewer")
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 sm:w-36"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviteBusy}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {inviteBusy ? "Sending…" : "Invite"}
              </button>
            </form>
          ) : null}

          {inviteFlash ? (
            <p className="mt-3 text-sm text-emerald-800">{inviteFlash}</p>
          ) : null}

          <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Members
          </h3>
          <ul className="mt-2 space-y-2">
            {team.members.map((m) => (
              <li
                key={m.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-zinc-900">
                    {m.name || m.email || m.userId}
                  </span>
                  {m.email ? (
                    <span className="ml-2 text-zinc-500">{m.email}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-zinc-500">
                    {m.role}
                  </span>
                  {isOwner && m.role !== "owner" ? (
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:underline"
                      onClick={() => void removeMember(m.userId)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {isOwner && team.invitations.length > 0 ? (
            <>
              <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Pending invites
              </h3>
              <ul className="mt-2 space-y-2">
                {team.invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-800">{inv.email}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-zinc-500">
                        {inv.role}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-red-700 hover:underline"
                        onClick={() => void revokeInvite(inv.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {canEditEnvs ? (
        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Upload / replace</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Labels are unique per project. Use labels like <code>staging</code>,{" "}
            <code>prod</code>.
          </p>
          <form
            onSubmit={(e) => void upload(e)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-1">
              <label className="text-xs text-zinc-500">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500">Content</label>
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"API_KEY=...\nDATABASE_URL=..."}
                className="mt-1 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save env"}
              </button>
            </div>
          </form>
        </section>
      ) : myRole === "viewer" ? (
        <p className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          You have <strong>viewer</strong> access: you can open stored envs and
          create quick-share links, but not upload or delete blobs.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900">Stored envs</h2>
        <ul className="mt-3 space-y-2">
          {envs === null ? (
            <li className="text-sm text-zinc-500">Loading…</li>
          ) : envs.length === 0 ? (
            <li className="text-sm text-zinc-500">None yet.</li>
          ) : (
            envs.map((env) => (
              <li
                key={env.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2"
              >
                <span className="font-medium text-zinc-900">{env.label}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <button
                    type="button"
                    className="text-sm text-blue-700 hover:underline"
                    onClick={() => void openEnv(env.id, env.label)}
                  >
                    View / copy
                  </button>
                  <button
                    type="button"
                    className="text-sm text-violet-700 hover:underline"
                    onClick={() =>
                      setShareTarget({ id: env.id, label: env.label })
                    }
                  >
                    Quick share link
                  </button>
                  {canEditEnvs ? (
                    <button
                      type="button"
                      className="text-sm text-red-700 hover:underline"
                      onClick={() => void deleteEnv(env.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {shareTarget ? (
        <ShareStoredEnvModal
          projectId={projectId}
          envId={shareTarget.id}
          envLabel={shareTarget.label}
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
        />
      ) : null}

      {viewing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-medium text-zinc-900">{viewing.label}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
                  onClick={() => void copyViewing()}
                >
                  Copy all
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs"
                  onClick={() => setViewing(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[60vh] overflow-auto p-4 text-left text-xs leading-relaxed text-zinc-800">
              {viewing.content}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
