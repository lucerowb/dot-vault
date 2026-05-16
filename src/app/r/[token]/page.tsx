import type { Metadata } from "next";

import { ReceivePanel } from "@/components/ReceivePanel";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Receive · ${token.slice(0, 8)}…`,
    description: "Decrypt a shared DotVault link in your browser.",
    robots: { index: false, follow: false },
  };
}

export default async function ReceivePage({ params }: Props) {
  const { token } = await params;
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <header className="mb-10 max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Open vault
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Decryption happens locally. The key is only in this page&apos;s URL
          fragment.
        </p>
      </header>
      <ReceivePanel token={token} />
    </div>
  );
}
