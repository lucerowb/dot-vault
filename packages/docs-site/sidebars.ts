import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    "README",
    {
      type: "category",
      label: "Getting started",
      items: ["FEATURES_SUMMARY", "MANUAL_STEPS", "SELF_HOSTED"],
    },
    {
      type: "category",
      label: "CLI & tools",
      items: ["CLI", "BROWSER_EXTENSION"],
    },
    {
      type: "category",
      label: "Vault & secrets",
      items: [
        "IMPORT_EXPORT",
        "SECRET_TEMPLATES",
        "VERSION_HISTORY",
        "ENV_SYNC",
        "SECRET_ROTATION",
        "SECRET_ANALYTICS",
      ],
    },
    {
      type: "category",
      label: "Security & access",
      items: [
        "AUDIT_LOGS",
        "ACCESS_REQUESTS",
        "BREAK_GLASS",
        "2FA",
        "IP_ALLOWLIST",
      ],
    },
    {
      type: "category",
      label: "Integrations",
      items: [
        "GITHUB_INTEGRATION",
        "CICD_INTEGRATION",
        "API_WEBHOOKS",
        "NOTIFICATIONS",
      ],
    },
    {
      type: "category",
      label: "Teams",
      items: ["TEAM_WORKSPACES"],
    },
  ],
};

export default sidebars;
