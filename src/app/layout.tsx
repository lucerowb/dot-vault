import type { Metadata } from "next";

import { SiteHeader } from "@/components/SiteHeader";
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fafafa] text-zinc-900">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
