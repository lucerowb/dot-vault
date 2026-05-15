"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { getErrorMessage } from "@/lib/api-client";
import { useProjectAudit } from "@/hooks/use-projects";
import type { AuditEntry } from "@/types/project.types";

interface AuditLogProps {
  projectId: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  project_create: {
    label: "Created Project",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  project_update: {
    label: "Updated Project",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  project_delete: {
    label: "Deleted Project",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  env_create: {
    label: "Created Environment",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  env_update: {
    label: "Updated Environment",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  env_delete: {
    label: "Deleted Environment",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  env_view: {
    label: "Viewed Environment",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  },
  env_version_rollback: {
    label: "Rolled Back Version",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  member_invite: {
    label: "Invited Member",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  member_accept: {
    label: "Accepted Invitation",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  member_remove: {
    label: "Removed Member",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  member_role_change: {
    label: "Changed Member Role",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  login: {
    label: "Logged In",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  },
  logout: {
    label: "Logged Out",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  },
  quick_share_create: {
    label: "Created Quick Share",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  quick_share_view: {
    label: "Viewed Quick Share",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  },
  quick_share_revoke: {
    label: "Revoked Quick Share",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const AUDIT_LIMIT = 50;

export function AuditLog({ projectId }: AuditLogProps) {
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isPending, isFetching, error, refetch } = useProjectAudit(
    projectId,
    { offset, filter: filter, limit: AUDIT_LIMIT },
  );

  const logs = data?.logs ?? [];
  const total = data?.pagination.total ?? 0;
  const hasMore = data?.pagination.hasMore ?? false;
  const loading = isPending || isFetching;

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

  function getActionBadge(action: string) {
    const config = ACTION_LABELS[action] || {
      label: action.replace(/_/g, " "),
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  }

  function formatMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata) return "";

    const parts: string[] = [];
    if (metadata.label) parts.push(`Label: ${metadata.label}`);
    if (metadata.name) parts.push(`Name: ${metadata.name}`);
    if (metadata.slug) parts.push(`Slug: ${metadata.slug}`);
    if (metadata.email) parts.push(`Email: ${metadata.email}`);
    if (metadata.role) parts.push(`Role: ${metadata.role}`);
    if (metadata.via) parts.push(`Via: ${metadata.via}`);

    return parts.join(" • ");
  }

  if (isPending && logs.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-3" />
        Loading audit logs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 dark:text-red-400">
        <p className="mb-2">
          {getErrorMessage(error, "Failed to load audit logs")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const uniqueActions = Array.from(
    new Set(logs.map((l: AuditEntry) => l.action)),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Audit Log
        </h3>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {ACTION_LABELS[action]?.label || action.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>No audit logs found</p>
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.03 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(log.action)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {log.user && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {log.user.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({log.user.email})
                          </span>
                        </div>
                      )}

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {formatMetadata(log.metadata)}
                        </div>
                      )}

                      {log.ipAddress && (
                        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {total > AUDIT_LIMIT && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {offset + 1} - {Math.min(offset + logs.length, total)}{" "}
                of {total}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOffset((o) => Math.max(0, o - AUDIT_LIMIT))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setOffset((o) => o + AUDIT_LIMIT)}
                  disabled={!hasMore}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
