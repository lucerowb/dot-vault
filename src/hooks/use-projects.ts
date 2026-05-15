"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AuditLogPage,
  EnvContent,
  EnvMeta,
  EnvVersion,
  InvitationPreview,
  ProjectDetail,
  ProjectRow,
  ProjectTeam,
} from "@/types/project.types";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => apiGet<ProjectRow[]>("/api/projects"),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiPost<{ id: string }>("/api/projects", { name: name.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => apiGet<ProjectDetail>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useProjectEnvs(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.envs(projectId),
    queryFn: () => apiGet<EnvMeta[]>(`/api/projects/${projectId}/envs`),
    enabled: !!projectId,
  });
}

export function useProjectTeam(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: () => apiGet<ProjectTeam>(`/api/projects/${projectId}/members`),
    enabled: !!projectId,
  });
}

export function useEnvContent(
  projectId: string,
  envId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.projects.env(projectId, envId),
    queryFn: () =>
      apiGet<EnvContent>(`/api/projects/${projectId}/envs/${envId}`),
    enabled: enabled && !!projectId && !!envId,
  });
}

export function useEnvVersions(
  projectId: string,
  envId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projects.envVersions(projectId, envId),
    queryFn: () =>
      apiGet<EnvVersion[]>(`/api/projects/${projectId}/envs/${envId}/versions`),
    enabled: enabled && !!projectId && !!envId,
  });
}

export function useProjectAudit(
  projectId: string,
  params: { offset: number; filter: string; limit?: number },
  enabled = true,
) {
  const limit = params.limit ?? 50;
  return useQuery({
    queryKey: queryKeys.projects.audit(projectId, {
      offset: params.offset,
      filter: params.filter,
    }),
    queryFn: () => {
      const search = new URLSearchParams({
        limit: String(limit),
        offset: String(params.offset),
      });
      if (params.filter) {
        search.set("action", params.filter);
      }
      return apiGet<AuditLogPage>(`/api/projects/${projectId}/audit?${search}`);
    },
    enabled: enabled && !!projectId,
  });
}

function invalidateProjectData(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.projects.envs(projectId),
  });
  void queryClient.invalidateQueries({
    queryKey: ["projects", projectId, "audit"],
  });
}

export function useUploadEnv(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; content: string }) =>
      apiPost(`/api/projects/${projectId}/envs`, input),
    onSuccess: () => invalidateProjectData(queryClient, projectId),
  });
}

export function useDeleteEnv(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (envId: string) =>
      apiDelete(`/api/projects/${projectId}/envs/${envId}`),
    onSuccess: (_data, envId) => {
      invalidateProjectData(queryClient, projectId);
      void queryClient.removeQueries({
        queryKey: queryKeys.projects.env(projectId, envId),
      });
    },
  });
}

export function useDeleteProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/api/projects/${projectId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useRollbackEnvVersion(projectId: string, envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { versionId: string; comment?: string }) =>
      apiPost(`/api/projects/${projectId}/envs/${envId}/versions`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.envVersions(projectId, envId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.env(projectId, envId),
      });
      invalidateProjectData(queryClient, projectId);
    },
  });
}

export function useSendInvite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: "editor" | "viewer" }) =>
      apiPost<{ acceptUrl?: string }>(
        `/api/projects/${projectId}/invitations`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
    },
  });
}

export function useRevokeInvite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiDelete(
        `/api/projects/${projectId}/invitations/${encodeURIComponent(invitationId)}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiDelete(
        `/api/projects/${projectId}/members/${encodeURIComponent(userId)}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
    },
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: queryKeys.invitations.preview(token),
    queryFn: () =>
      apiGet<InvitationPreview>(
        `/api/projects/invitations/by-token?token=${encodeURIComponent(token)}`,
      ),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      apiPost<{ projectId: string }>("/api/projects/invitations/accept", {
        token,
      }),
  });
}
