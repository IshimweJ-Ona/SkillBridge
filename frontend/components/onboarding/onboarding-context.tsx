"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface OnboardingContextValue {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, show: () => setOpen(true), hide: () => setOpen(false) }),
    [open],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider.");
  }
  return context;
}
