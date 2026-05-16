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

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: "DotVault — Secure .env handoffs",
    template: "%s · DotVault",
  },
  description:
    "Zero-knowledge quick share plus encrypted cloud vault for environment files.",
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
    description:
      "Share and store .env files with browser crypto, Better Auth, and Supabase.",
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
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_JS}
        </Script>
        <ClientProviders>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
