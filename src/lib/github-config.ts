/** GitHub App URL slug (Settings → GitHub Apps → your app → "Public link"). */
const DEFAULT_GITHUB_APP_SLUG = "dot-vault";

export function getGitHubAppSlug(): string {
  const slug = process.env.GITHUB_APP_SLUG?.trim();
  return slug && slug.length > 0 ? slug : DEFAULT_GITHUB_APP_SLUG;
}

export function getGitHubAppInstallationUrl(): string {
  return `https://github.com/apps/${encodeURIComponent(getGitHubAppSlug())}/installations/new`;
}
