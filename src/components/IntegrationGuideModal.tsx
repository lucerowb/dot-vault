"use client";

import { motion } from "framer-motion";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function IntegrationGuideModal({
  open,
  title,
  onClose,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="integration-guide-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2
            id="integration-guide-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm text-zinc-700 dark:text-zinc-300">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export function GuideSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal space-y-3 pl-5 marker:font-medium marker:text-zinc-500 dark:marker:text-zinc-400">
      {steps.map((step) => (
        <li key={step} className="pl-1 leading-relaxed">
          {step}
        </li>
      ))}
    </ol>
  );
}

export function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
      {children}
    </p>
  );
}
