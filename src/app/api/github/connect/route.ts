import { auth } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getGitHubAppInstallationUrl } from "@/lib/github-config";
import { z } from "zod";

const ConnectBody = z.object({
  code: z.string(),
  installationId: z.string().optional(),
});

// Exchange GitHub OAuth code for access token
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
}> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  return await response.json();
}

// Fetch user's GitHub repositories
async function fetchUserRepos(accessToken: string): Promise<
  Array<{
    id: number;
    full_name: string;
    html_url: string;
    private: boolean;
    description: string | null;
  }>
> {
  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DotVault",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }

  return await response.json();
}

// Fetch GitHub App installations for user
async function fetchAppInstallations(accessToken: string): Promise<
  Array<{
    id: number;
    account: {
      login: string;
      type: string;
    };
    repository_selection: string;
  }>
> {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    return [];
  }

  const response = await fetch("https://api.github.com/user/installations", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DotVault",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.installations || [];
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Expected JSON body.", 400);
  }

  const parsed = ConnectBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(parsed.data.code);

    if (!tokenData.access_token) {
      return jsonError(
        "GITHUB_ERROR",
        "Failed to authenticate with GitHub",
        400,
      );
    }

    // Fetch user's repositories
    const repos = await fetchUserRepos(tokenData.access_token);

    // Fetch app installations
    const installations = await fetchAppInstallations(tokenData.access_token);

    // In production, store the GitHub connection in the database
    // For now, return the data

    return jsonSuccess({
      connected: true,
      repositories: repos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        url: r.html_url,
        isPrivate: r.private,
        description: r.description,
      })),
      installations: installations.map((i) => ({
        id: i.id,
        account: i.account.login,
        type: i.account.type,
        repositorySelection: i.repository_selection,
      })),
    });
  } catch (error) {
    console.error("GitHub connection error:", error);
    return jsonError(
      "GITHUB_ERROR",
      error instanceof Error ? error.message : "Failed to connect to GitHub",
      500,
    );
  }
}

// GET endpoint to check GitHub connection status
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  // In production, check database for stored GitHub connection
  // For now, return configuration status

  const clientId = process.env.GITHUB_CLIENT_ID;
  const appId = process.env.GITHUB_APP_ID;

  return jsonSuccess({
    configured: !!(clientId && appId),
    githubAuthUrl: clientId
      ? `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user`
      : null,
    appInstallationUrl: appId ? getGitHubAppInstallationUrl() : null,
  });
}
