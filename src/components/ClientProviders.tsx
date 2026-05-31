"use client";

import { AppToaster } from "@/components/AppToaster";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useReloadHomeAfterDocsBack } from "@/hooks/use-reload-home-after-docs-back";

function NavigationRecovery() {
  useReloadHomeAfterDocsBack();
  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <NavigationRecovery />
        {children}
        <AppToaster />
      </ThemeProvider>
    </QueryProvider>
  );
}
