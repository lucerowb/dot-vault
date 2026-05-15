"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  GitHubStatus,
  ScanResult,
  SecretPattern,
} from "@/types/project.types";

export function useGitHubStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.github.status,
    queryFn: () => apiGet<GitHubStatus>("/api/github/connect"),
    enabled,
  });
}

export function useSecretPatterns(enabled = true) {
  return useQuery({
    queryKey: queryKeys.github.patterns,
    queryFn: () =>
      apiGet<{ patterns: SecretPattern[] }>("/api/github/scan").then(
        (data) => data.patterns,
      ),
    enabled,
  });
}

export function useSecretScan() {
  return useMutation({
    mutationFn: (input: { content: string; filename?: string }) =>
      apiPost<ScanResult>("/api/github/scan", {
        content: input.content,
        filename: input.filename ?? "scan.txt",
      }),
  });
}
