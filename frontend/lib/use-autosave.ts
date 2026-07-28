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

  // `overrideValue` lets a caller save a value it just produced (e.g. a
  // Cloudinary URL from an upload's onChange) in the same tick it calls
  // setState. Without it, this closes over `latestValue.current`, which is
  // synced from `value` by the effect above - and that effect hasn't run yet
  // when setState + saveNow() fire back-to-back in the same event handler,
  // so the save would silently persist the pre-update value (the new avatar/
  // CV/tag never reaches the backend, even though it uploaded to Cloudinary
  // fine and appears to "work" until the next reload).
  const runSave = useCallback(
    async (overrideValue?: T) => {
      const valueToSave = overrideValue !== undefined ? overrideValue : latestValue.current;
      if (lastSaved.current === valueToSave) return;
      setStatus("saving");
      try {
        await save(valueToSave);
        lastSaved.current = valueToSave;
        latestValue.current = valueToSave;
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    },
    [save],
  );

  useEffect(() => {
    const interval = setInterval(() => runSave(), intervalMs);
    return () => clearInterval(interval);
  }, [runSave, intervalMs]);

  return { status, saveNow: runSave };
}
