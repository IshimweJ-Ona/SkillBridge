"use client";

import { Check, Loader2, RotateCcw } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function AutosaveIndicator({
  status,
  onRetry,
  className,
}: {
  status: AutosaveStatus;
  onRetry?: () => void;
  className?: string;
}) {
  if (status === "idle") return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {status === "saving" && (
        <span className="flex items-center gap-1.5 text-[var(--sb-text-muted)]">
          <Loader2 size={13} className="animate-spin" /> Saving...
        </span>
      )}
      {status === "saved" && (
        <span className="flex items-center gap-1.5 text-[var(--sb-success)]">
          <Check size={13} /> Saved
        </span>
      )}
      {status === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 text-[var(--sb-danger)] hover:underline"
        >
          <RotateCcw size={13} /> Save failed - Retry
        </button>
      )}
    </div>
  );
}
