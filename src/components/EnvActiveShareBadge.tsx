"use client";

import { useSyncExternalStore } from "react";

import {
  activeEnvQuickShareCount,
  subscribeEnvQuickShares,
} from "@/lib/env-quick-shares";

type Props = {
  projectId: string;
  envId: string;
};

export function EnvActiveShareBadge({ projectId, envId }: Props) {
  const count = useSyncExternalStore(
    subscribeEnvQuickShares,
    () => activeEnvQuickShareCount(projectId, envId),
    () => 0,
  );

  if (count === 0) return null;

  return (
    <span className="mt-0.5 block text-xs text-violet-700 dark:text-violet-300">
      {count} active share{count === 1 ? "" : "s"}
    </span>
  );
}
