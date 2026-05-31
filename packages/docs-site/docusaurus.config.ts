import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

const config: Config = {
  title: "DotVault",
  tagline: "Secure .env handoffs and encrypted cloud vault",
  favicon: "img/logo-mark.png",

  future: {
    v4: true,
  },

  url: appUrl,
  baseUrl: "/docs/",
  trailingSlash: true,

  organizationName: "lucerowb",
  projectName: "dot-vault",

  onBrokenLinks: "warn",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          path: "../../docs",
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/lucerowb/dot-vault/tree/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Documentation",
      logo: {
        alt: "DotVault",
        src: "img/logo-mark.png",
        srcDark: "img/logo-mark-dark.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Guides",
        },
        {
          href: "https://github.com/lucerowb/dot-vault",
          label: "GitHub",
          position: "right",
        },
        {
          label: "Open app",
          href: appUrl,
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Guides",
          items: [
            { label: "Features overview", to: "/FEATURES_SUMMARY" },
            { label: "Manual setup", to: "/MANUAL_STEPS" },
            { label: "Self-hosted", to: "/SELF_HOSTED" },
          ],
        },
        {
          title: "Product",
          items: [
            { label: "CLI", to: "/CLI" },
            { label: "Browser extension", to: "/BROWSER_EXTENSION" },
            { label: "API & webhooks", to: "/API_WEBHOOKS" },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/lucerowb/dot-vault",
            },
            { label: "Open app", href: appUrl },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DotVault contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
