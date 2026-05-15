import type { Metadata } from "next";

import { QuickSharePanel } from "@/components/QuickSharePanel";

const siteDescription =
  "Zero-knowledge quick share plus encrypted cloud vault for environment files.";

export const metadata: Metadata = {
  title: "Quick share",
  description: siteDescription,
};

export default function QuickSharePage() {
  return <QuickSharePanel />;
}
