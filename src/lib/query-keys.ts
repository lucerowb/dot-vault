export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    detail: (projectId: string) => ["projects", projectId] as const,
    envs: (projectId: string) => ["projects", projectId, "envs"] as const,
    env: (projectId: string, envId: string) =>
      ["projects", projectId, "envs", envId] as const,
    envVersions: (projectId: string, envId: string) =>
      ["projects", projectId, "envs", envId, "versions"] as const,
    members: (projectId: string) => ["projects", projectId, "members"] as const,
    audit: (projectId: string, params: { offset: number; filter: string }) =>
      ["projects", projectId, "audit", params] as const,
  },
  invitations: {
    preview: (token: string) => ["invitations", "preview", token] as const,
  },
  github: {
    status: ["github", "status"] as const,
    patterns: ["github", "patterns"] as const,
  },
} as const;
