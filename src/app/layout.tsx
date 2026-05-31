import type { Metadata } from "next";
import Script from "next/script";

import { ClientProviders } from "@/components/ClientProviders";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_BOOT_JS } from "@/lib/theme-boot";
import "./globals.css";

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL &&
  /^https?:\/\//i.test(process.env.NEXT_PUBLIC_APP_URL)
    ? process.env.NEXT_PUBLIC_APP_URL
    : "http://localhost:3000";

const siteDescription =
  "Zero-knowledge quick share plus encrypted cloud vault for environment files.";

const aiChatWidgetSrc = process.env.NEXT_PUBLIC_AI_CHAT_WIDGET_URL?.trim();
const aiChatApiKey = process.env.NEXT_PUBLIC_AI_CHAT_API_KEY?.trim();
const aiChatOrgId = process.env.NEXT_PUBLIC_AI_CHAT_ORG_ID?.trim();
const showAiChatWidget = Boolean(
  aiChatWidgetSrc && aiChatApiKey && aiChatOrgId,
);

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: "DotVault — Secure .env handoffs",
    template: "%s · DotVault",
  },
  description: siteDescription,
  icons: {
    icon: [
      {
        url: "/brand/logo-mark.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/logo-mark-dark.png",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "DotVault",
    description: siteDescription,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <noscript>
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            JavaScript is required: DotVault encrypts and decrypts secrets in
            your browser. Enable JavaScript to use quick share and cloud vault.
          </div>
        </noscript>
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_JS}
        </Script>
        <ClientProviders>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </ClientProviders>
        {showAiChatWidget ? (
          <Script
            strategy="lazyOnload"
            type="module"
            src={aiChatWidgetSrc}
            id="ai-chat-widget"
            data-api-key={aiChatApiKey}
            data-org-id={aiChatOrgId}
          />
        ) : null}
      </body>
    </html>
  );
}
