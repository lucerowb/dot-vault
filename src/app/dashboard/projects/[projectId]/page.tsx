"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ShareStoredEnvModal } from "@/components/ShareStoredEnvModal";
import { VersionHistory } from "@/components/VersionHistory";
import { AuditLog } from "@/components/AuditLog";
import { GitHubIntegration } from "@/components/GitHubIntegration";
import { apiGet, getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  useDeleteEnv,
  useDeleteProject,
  useProject,
  useProjectEnvs,
  useProjectTeam,
  useRemoveMember,
  useRevokeInvite,
  useSendInvite,
  useUploadEnv,
} from "@/hooks/use-projects";
import type {
  EnvContent,
  EnvMeta,
  ProjectRole,
  TeamMember,
  InvitationRow,
} from "@/types/project.types";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const queryClient = useQueryClient();
  const projectQuery = useProject(projectId);
  const envsQuery = useProjectEnvs(projectId);
  const teamQuery = useProjectTeam(projectId);
  const uploadEnv = useUploadEnv(projectId);
  const deleteEnvMutation = useDeleteEnv(projectId);
  const deleteProjectMutation = useDeleteProject(projectId);
  const inviteMutation = useSendInvite(projectId);
  const revokeInviteMutation = useRevokeInvite(projectId);
  const removeMemberMutation = useRemoveMember(projectId);

  const project = projectQuery.data ?? null;
  const envs = envsQuery.data;
  const team = teamQuery.data ?? null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [label, setLabel] = useState("default");
  const [content, setContent] = useState("");
  const [viewing, setViewing] = useState<{
    label: string;
    content: string;
  } | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "envs" | "versions" | "audit" | "github"
  >("envs");
  const [selectedEnvForVersions, setSelectedEnvForVersions] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteFlash, setInviteFlash] = useState<string | null>(null);

  const myRole: ProjectRole | undefined = project?.myRole ?? team?.myRole;
  const canEditEnvs = myRole === "owner" || myRole === "editor";
  const isOwner = myRole === "owner";

  const loadError =
    projectQuery.error != null
      ? getErrorMessage(projectQuery.error, "Project not found.")
      : null;
  const error = actionError ?? loadError;

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    try {
      await uploadEnv.mutateAsync({ label: label.trim(), content });
      setContent("");
    } catch (err) {
      setActionError(getErrorMessage(err, "Upload failed."));
    }
  }

  async function deleteEnv(id: string) {
    if (!confirm("Delete this env blob?")) return;
    setActionError(null);
    try {
      await deleteEnvMutation.mutateAsync(id);
    } catch {
      setActionError("Could not delete.");
    }
  }

  async function openEnv(id: string, labelName: string) {
    setActionError(null);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.projects.env(projectId, id),
        queryFn: () =>
          apiGet<EnvContent>(`/api/projects/${projectId}/envs/${id}`),
      });
      setViewing({ label: labelName, content: data.content });
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not load env."));
    }
  }

  async function deleteProject() {
    if (!confirm("Delete this project and all env files?")) return;
    setActionError(null);
    try {
      await deleteProjectMutation.mutateAsync();
      router.push("/dashboard");
    } catch {
      setActionError("Could not delete project.");
    }
  }

  async function copyViewing() {
    if (!viewing) return;
    await navigator.clipboard.writeText(viewing.content);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteFlash(null);
    setActionError(null);
    try {
      const result = await inviteMutation.mutateAsync({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      if (result.acceptUrl) {
        await navigator.clipboard.writeText(result.acceptUrl);
        setInviteFlash("Invite created. Accept link copied to clipboard.");
      } else {
        setInviteFlash("Invite created.");
      }
    } catch (err) {
      setActionError(getErrorMessage(err, "Invite failed."));
    }
  }

  async function revokeInviteHandler(id: string) {
    setActionError(null);
    try {
      await revokeInviteMutation.mutateAsync(id);
    } catch {
      setActionError("Could not revoke invite.");
    }
  }

  async function removeMemberHandler(userId: string) {
    if (!confirm("Remove this collaborator?")) return;
    setActionError(null);
    try {
      await removeMemberMutation.mutateAsync(userId);
    } catch {
      setActionError("Could not remove member.");
    }
  }

  if (projectQuery.isPending && !project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (loadError && !project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-700 dark:text-red-400">{loadError}</p>
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
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200"
          >
            ← Projects
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {project?.name ?? "…"}
            </h1>
            {myRole ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                {myRole}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {project?.slug}
          </p>
        </div>
        {isOwner ? (
          <button
            type="button"
            onClick={() => void deleteProject()}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-800 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/50"
          >
            Delete project
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}

      {team ? (
        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/90 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Team
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Owner can invite by email. Invited users sign in with that email and
            open the accept link.
          </p>

          {isOwner ? (
            <form
              onSubmit={(e) => void sendInvite(e)}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="min-w-[200px] flex-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "editor" | "viewer")
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 sm:w-36"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {inviteMutation.isPending ? "Sending…" : "Invite"}
              </button>
            </form>
          ) : null}

          {inviteFlash ? (
            <p className="mt-3 text-sm text-emerald-800">{inviteFlash}</p>
          ) : null}

          <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Members
          </h3>
          <ul className="mt-2 space-y-2">
            {team.members.map((m: TeamMember) => (
              <li
                key={m.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/80 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {m.name || m.email || m.userId}
                  </span>
                  {m.email ? (
                    <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                      {m.email}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                    {m.role}
                  </span>
                  {isOwner && m.role !== "owner" ? (
                    <button
                      type="button"
                      className="text-xs text-red-700 dark:text-red-400 hover:underline"
                      onClick={() => void removeMemberHandler(m.userId)}
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
              <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Pending invites
              </h3>
              <ul className="mt-2 space-y-2">
                {team.invitations.map((inv: InvitationRow) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {inv.email}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                        {inv.role}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-red-700 dark:text-red-400 hover:underline"
                        onClick={() => void revokeInviteHandler(inv.id)}
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
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                {viewing.label}
              </h3>
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
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  onClick={() => setViewing(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[60vh] overflow-auto p-4 text-left text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
              {viewing.content}
            </pre>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mt-10 border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: "envs", label: "Environments" },
            { id: "versions", label: "Version History" },
            { id: "audit", label: "Audit Log" },
            { id: "github", label: "GitHub" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "envs" && (
          <section>
            {canEditEnvs ? (
              <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/90 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Upload / replace
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Labels are unique per project. Use labels like{" "}
                  <code>staging</code>, <code>prod</code>.
                </p>
                <form
                  onSubmit={(e) => void upload(e)}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <div className="sm:col-span-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">
                      Label
                    </label>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">
                      Content
                    </label>
                    <textarea
                      rows={8}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={"API_KEY=...\nDATABASE_URL=..."}
                      className="mt-1 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={uploadEnv.isPending}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {uploadEnv.isPending ? "Saving…" : "Save env"}
                    </button>
                  </div>
                </form>
              </div>
            ) : myRole === "viewer" ? (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                You have <strong>viewer</strong> access: you can open stored
                envs and create quick-share links, but not upload or delete
                blobs.
              </p>
            ) : null}

            <section className="mt-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Stored envs
              </h2>
              <ul className="mt-3 space-y-2">
                {envsQuery.isPending ? (
                  <li className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading…
                  </li>
                ) : !envs?.length ? (
                  <li className="text-sm text-zinc-500 dark:text-zinc-400">
                    None yet.
                  </li>
                ) : (
                  (envs ?? []).map((env: EnvMeta) => (
                    <li
                      key={env.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/90 px-3 py-2"
                    >
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {env.label}
                      </span>
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
                        <button
                          type="button"
                          className="text-sm text-emerald-700 hover:underline"
                          onClick={() => {
                            setSelectedEnvForVersions({
                              id: env.id,
                              label: env.label,
                            });
                            setActiveTab("versions");
                          }}
                        >
                          History
                        </button>
                        {canEditEnvs ? (
                          <button
                            type="button"
                            className="text-sm text-red-700 dark:text-red-400 hover:underline"
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
          </section>
        )}

        {activeTab === "versions" && (
          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/90 p-5 shadow-sm">
            {selectedEnvForVersions ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Version History
                  </h2>
                  <button
                    onClick={() => setSelectedEnvForVersions(null)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ← Back to envs
                  </button>
                </div>
                <VersionHistory
                  projectId={projectId}
                  envId={selectedEnvForVersions.id}
                  envLabel={selectedEnvForVersions.label}
                />
              </>
            ) : (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <p className="mb-4">
                  Select an environment to view its version history
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {envs?.map((env: EnvMeta) => (
                    <button
                      key={env.id}
                      onClick={() =>
                        setSelectedEnvForVersions({
                          id: env.id,
                          label: env.label,
                        })
                      }
                      className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "audit" && (
          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/90 p-5 shadow-sm">
            <AuditLog projectId={projectId} />
          </section>
        )}

        {activeTab === "github" && (
          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/90 p-5 shadow-sm">
            <GitHubIntegration />
          </section>
        )}
      </div>
    </div>
  );
}
