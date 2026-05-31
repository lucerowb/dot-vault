import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Docusaurus dev server (see `pnpm dev` / packages/docs-site). */
const docsDevOrigin =
  process.env.DOCS_DEV_ORIGIN?.replace(/\/$/, "") ?? "http://127.0.0.1:3456";

const aiChatWidgetOrigin = "https://widget.dev.aichat.site";
const aiChatApiOrigin = "https://api.dev.aichat.site";
const turnstileOrigin = "https://challenges.cloudflare.com";

const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${aiChatWidgetOrigin} ${turnstileOrigin}`
  : `script-src 'self' 'unsafe-inline' ${aiChatWidgetOrigin} ${turnstileOrigin}`;

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${aiChatWidgetOrigin} ${aiChatApiOrigin} ${turnstileOrigin}`,
  `frame-src 'self' ${aiChatWidgetOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Docusaurus uses trailing slashes (/docs/); avoid Next stripping them before the dev proxy.
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    if (!isDev) {
      return [
        {
          source: "/docs",
          destination: "/docs/",
          permanent: true,
        },
      ];
    }
    return [];
  },
  async rewrites() {
    if (isDev) {
      return [
        {
          source: "/docs",
          destination: `${docsDevOrigin}/docs/`,
        },
        {
          source: "/docs/",
          destination: `${docsDevOrigin}/docs/`,
        },
        {
          source: "/docs/:path*",
          destination: `${docsDevOrigin}/docs/:path*`,
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/vault/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
