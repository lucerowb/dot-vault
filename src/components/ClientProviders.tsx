"use client";

import { AppToaster } from "@/components/AppToaster";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <AppToaster />
      </ThemeProvider>
    </QueryProvider>
  );
}
