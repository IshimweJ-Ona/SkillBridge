"use client";

import { useCallback, useEffect, useState } from "react";

// No backend model exists for bookmarked jobs (see plan's reconciliation
// notes) - this is a deliberate browser-local convenience, not synced
// across devices, until a real SavedJob endpoint exists.
const STORAGE_KEY = "skillbridge.savedJobs.v1";

function readSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useSavedJobs() {
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  const isSaved = useCallback((jobUuid: string) => saved.includes(jobUuid), [saved]);

  const toggle = useCallback((jobUuid: string) => {
    setSaved((current) => {
      const next = current.includes(jobUuid)
        ? current.filter((uuid) => uuid !== jobUuid)
        : [...current, jobUuid];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { saved, isSaved, toggle };
}
