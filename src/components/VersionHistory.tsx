"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { getErrorMessage } from "@/lib/api-client";
import { useEnvVersions, useRollbackEnvVersion } from "@/hooks/use-projects";
import type { EnvVersion } from "@/types/project.types";

interface VersionHistoryProps {
  projectId: string;
  envId: string;
  envLabel: string;
}

export function VersionHistory({
  projectId,
  envId,
  envLabel,
}: VersionHistoryProps) {
  const {
    data: versions = [],
    isPending,
    error,
    refetch,
  } = useEnvVersions(projectId, envId);
  const rollback = useRollbackEnvVersion(projectId, envId);

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleRollback(versionId: string) {
    if (!showConfirm) {
      setSelectedVersion(versionId);
      setShowConfirm(true);
      return;
    }

    try {
      await rollback.mutateAsync({
        versionId,
        comment: "Rolled back from version history",
      });
      setShowConfirm(false);
      setSelectedVersion(null);
      void refetch();
    } catch {
      // rollback.error available if needed
    }
  }

  function getChangeTypeIcon(type: EnvVersion["changeType"]) {
    switch (type) {
      case "created":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Created
          </span>
        );
      case "updated":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Updated
          </span>
        );
      case "deleted":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Deleted
          </span>
        );
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const rollbackError =
    rollback.error != null
      ? getErrorMessage(rollback.error, "Rollback failed")
      : null;
  const displayError =
    error != null
      ? getErrorMessage(error, "Failed to load versions")
      : rollbackError;

  if (isPending) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
        Loading version history...
      </div>
    );
  }

  if (displayError && versions.length === 0) {
    return (
      <div className="p-4 text-center text-red-500 dark:text-red-400">
        {displayError}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No version history available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayError ? (
        <p className="text-sm text-red-500 dark:text-red-400" role="alert">
          {displayError}
        </p>
      ) : null}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Version History: {envLabel}
      </h3>

      <div className="space-y-2">
        <AnimatePresence>
          {versions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.05 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getChangeTypeIcon(version.changeType)}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Version {version.version}
                    </span>
                  </div>

                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                    {version.changedBy.name}
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {" "}
                      ({version.changedBy.email})
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(version.createdAt)}
                  </div>

                  {version.comment && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                      {version.comment}
                    </div>
                  )}
                </div>

                {index > 0 && version.changeType !== "deleted" && (
                  <button
                    type="button"
                    onClick={() => void handleRollback(version.id)}
                    disabled={rollback.isPending}
                    className="ml-4 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                  >
                    {rollback.isPending && selectedVersion === version.id
                      ? "Rolling back..."
                      : "Restore"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            >
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Confirm Rollback
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to restore this version? This will create
                a new version with the restored content.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectedVersion && void handleRollback(selectedVersion)
                  }
                  disabled={rollback.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {rollback.isPending ? "Restoring..." : "Restore Version"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
