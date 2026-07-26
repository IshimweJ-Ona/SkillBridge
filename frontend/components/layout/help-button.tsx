"use client";

import { HelpCircle, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "@/lib/i18n/context";
import { useOnboarding } from "../onboarding/onboarding-context";

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { show } = useOnboarding();

  return (
    <div className="sb-print-hide fixed bottom-5 right-5 z-40">
      {open && (
        <div className="sb-fade-in mb-3 w-72 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-4 shadow-xl shadow-black/40">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t("help.title")}</p>
            <button type="button" onClick={() => setOpen(false)} className="text-[var(--sb-text-faint)] hover:text-[var(--sb-text)]">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-[var(--sb-text-muted)]">{t("help.body")}</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              show();
            }}
            className="mt-3 text-xs font-medium text-[var(--sb-primary)] hover:underline"
          >
            {t("help.restartTour")}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Help"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] text-white shadow-lg shadow-black/40 hover:from-[var(--sb-primary-hover)] hover:to-[var(--sb-primary-hover)]"
      >
        <HelpCircle size={20} />
      </button>
    </div>
  );
}
