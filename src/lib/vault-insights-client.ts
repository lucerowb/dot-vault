import type { VaultInsightsData } from "@/types/vault.types";

export async function fetchVaultInsights(
  token: string,
  deleteToken: string,
): Promise<VaultInsightsData> {
  const res = await fetch(`/api/vault/${encodeURIComponent(token)}/insights`, {
    cache: "no-store",
    headers: { "X-Delete-Token": deleteToken },
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: VaultInsightsData;
    error?: { message?: string };
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Could not load link insights.");
  }
  return json.data;
}
