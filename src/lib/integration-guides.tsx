export type IntegrationGuideId =
  | "github-app-setup"
  | "github-install"
  | "secret-scanner"
  | "pr-scanning";

export type IntegrationGuideCard = {
  id: IntegrationGuideId;
  title: string;
  summary: string;
  steps: string[];
  modalTitle: string;
};

export const INTEGRATION_GUIDE_CARDS: IntegrationGuideCard[] = [
  {
    id: "github-app-setup",
    title: "Configure the GitHub App",
    summary:
      "Set server-side credentials so DotVault can talk to GitHub (required once per deployment).",
    modalTitle: "Configure the GitHub App",
    steps: [
      "Create a GitHub App (or use an existing one) under your org or personal account → Settings → Developer settings → GitHub Apps.",
      "Copy the App ID, client ID, client secret, and generate a private key (.pem).",
      "Add the values to your deployment environment (see .env.example): GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_WEBHOOK_SECRET.",
      "Set the webhook URL to your public DotVault URL plus /api/github/webhook (must be HTTPS in production).",
      "Redeploy or restart the app, then return to this Integration tab — the status below should show as configured.",
    ],
  },
  {
    id: "github-install",
    title: "Install on repositories",
    summary:
      "Grant the app access to the repos where you want PR checks and secret scanning.",
    modalTitle: "Install the GitHub App",
    steps: [
      "Confirm the integration status above shows GitHub App is configured (green indicator).",
      "Click Install GitHub App and choose your organization or personal account.",
      "Select all repositories or only the repos that should receive DotVault checks.",
      "Complete the GitHub installation flow — you can change repo access later in GitHub → Settings → GitHub Apps.",
      "Open a pull request in a connected repo; DotVault can comment and update check runs when webhooks are enabled.",
    ],
  },
  {
    id: "secret-scanner",
    title: "Scan before you commit",
    summary:
      "Paste env files or code snippets to catch API keys and tokens before they reach git.",
    modalTitle: "Use the secret scanner",
    steps: [
      "Copy the text you want to check (for example a .env draft, config snippet, or log excerpt).",
      "Paste it into the Secret Scanner textarea on this page.",
      "Click Scan for Secrets and review severity, line numbers, and matched patterns.",
      "Remove or rotate any real credentials that were flagged, then re-scan until no critical or high findings remain.",
      "Store production values in DotVault cloud envs or quick-share links instead of committing them to the repository.",
    ],
  },
  {
    id: "pr-scanning",
    title: "PR & webhook checks",
    summary:
      "Automatic feedback on pull requests when the GitHub App and webhook are active.",
    modalTitle: "Pull request & webhook flow",
    steps: [
      "Ensure GITHUB_WEBHOOK_SECRET matches the secret configured on your GitHub App webhook.",
      "Subscribe the webhook to pull_request, push, and check_run events (see docs/GITHUB_INTEGRATION.md in the repo for the full list).",
      "When a PR changes files that may contain secrets, DotVault can post review comments and update check status.",
      "Treat failed checks as blocking until secrets are removed from the diff or moved to DotVault.",
      "Use project envs in DotVault for team access; sync to GitHub Actions secrets only through approved workflows.",
    ],
  },
];
