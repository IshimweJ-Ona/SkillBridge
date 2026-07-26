"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AutosaveStatus } from "@/components/ui/autosave-indicator";

// SRS 3.1 shared UI standard: forms with 3+ fields autosave every 30 seconds
// and show a "Saving..." / "Saved" / "Save failed - Retry" indicator.
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, intervalMs = 30000) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const latestValue = useRef(value);
  const lastSaved = useRef<T | undefined>(undefined);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const runSave = useCallback(async () => {
    if (lastSaved.current === latestValue.current) return;
    setStatus("saving");
    try {
      await save(latestValue.current);
      lastSaved.current = latestValue.current;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [save]);

  useEffect(() => {
    const interval = setInterval(runSave, intervalMs);
    return () => clearInterval(interval);
  }, [runSave, intervalMs]);

  return { status, saveNow: runSave };
}
