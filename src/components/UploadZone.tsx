"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  disabled?: boolean;
  onFile: (text: string, name: string) => void;
  onPasteText: (text: string) => void;
};

export function UploadZone({ disabled, onFile, onPasteText }: Props) {
  const [drag, setDrag] = useState(false);
  const submittedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) submittedRef.current = false;
  }, [disabled]);

  const submitText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled || submittedRef.current) return;
      submittedRef.current = true;
      onPasteText(trimmed);
    },
    [disabled, onPasteText]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (!file) return;
      void file.text().then((t) => onFile(t, file.name));
    },
    [disabled, onFile]
  );

  return (
    <div className="w-full max-w-xl">
      <motion.div
        animate={{ scale: drag ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          "rounded-3xl border border-dashed px-8 py-16 text-center transition-colors",
          drag
            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40"
            : "border-zinc-300 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-900/60",
          disabled ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Drop a .env file here
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          or paste below — encrypted in your browser before upload
        </p>
        <label className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          Choose file
          <input
            type="file"
            accept=".env,.env.*,text/plain"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void file.text().then((t) => onFile(t, file.name));
              e.target.value = "";
            }}
          />
        </label>
      </motion.div>
      <textarea
        ref={textareaRef}
        rows={6}
        disabled={disabled}
        placeholder="Or paste environment file contents…"
        className="mt-6 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-inner outline-none ring-blue-500/30 transition focus:border-blue-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        onPaste={(e) => {
          const t = e.clipboardData.getData("text/plain");
          if (!t.trim()) return;
          e.preventDefault();
          submitText(t);
          if (textareaRef.current) textareaRef.current.value = "";
        }}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (!v) return;
          submitText(v);
          e.target.value = "";
        }}
      />
    </div>
  );
}
