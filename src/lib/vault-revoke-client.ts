export async function revokeVaultToken(
  token: string,
  deleteToken: string,
): Promise<void> {
  const res = await fetch(`/api/vault/${encodeURIComponent(token)}`, {
    method: "DELETE",
    headers: { "X-Delete-Token": deleteToken },
  });

  if (res.status === 204) {
    return;
  }

  if (res.status === 404) {
    throw new Error("Link was already removed or could not be revoked.");
  }

  const json = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  throw new Error(json?.error?.message ?? "Could not revoke link.");
}
