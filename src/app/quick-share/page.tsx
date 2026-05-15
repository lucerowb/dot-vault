import type { Metadata } from "next";

import { QuickSharePanel } from "@/components/QuickSharePanel";

export const metadata: Metadata = {
  title: "Quick share",
  description:
    "Create an encrypted, ephemeral link for .env-style files. Keys stay in the URL fragment.",
};

export default function QuickSharePage() {
  return <QuickSharePanel />;
}
