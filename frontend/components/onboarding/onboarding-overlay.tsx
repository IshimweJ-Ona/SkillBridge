"use client";

import { X } from "@/lib/icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { auth, type Role } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { useOnboarding } from "./onboarding-context";

const STEP_COUNT: Record<Role, number> = {
  YOUTH_USER: 4,
  EMPLOYER: 3,
  ANALYST: 3,
  ADMINISTRATOR: 3,
};

const ROLE_KEY: Record<Role, string> = {
  YOUTH_USER: "youth",
  EMPLOYER: "employer",
  ANALYST: "analyst",
  ADMINISTRATOR: "admin",
};

export function OnboardingOverlay() {
  const { user, setUser } = useAuth();
  const { open, show, hide } = useOnboarding();
  const t = useTranslations();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (user && !user.onboardingCompletedAt) {
      show();
    }
    // Only re-checks when the signed-in user changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uuid]);

  if (!open || !user) return null;

  const roleKey = ROLE_KEY[user.role];
  const total = STEP_COUNT[user.role];
  const stepIndex = step + 1;
  const title = t(`onboarding.${roleKey}.step${stepIndex}Title`);
  const body = t(`onboarding.${roleKey}.step${stepIndex}Body`);

  const finish = async () => {
    hide();
    setStep(0);
    if (!user.onboardingCompletedAt) {
      try {
        const { user: updated } = await auth.completeOnboarding();
        setUser(updated);
      } catch {
        // Non-critical: the overlay still closes; it will simply reappear
        // next session if this write failed.
      }
    }
  };

  return (
    <div className="sb-print-hide fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-[var(--sb-text-faint)]">
            {t("onboarding.stepLabel", { current: stepIndex, total })}
          </p>
          <button
            type="button"
            onClick={finish}
            aria-label={t("common.close")}
            className="text-[var(--sb-text-faint)] hover:text-[var(--sb-text)]"
          >
            <X size={16} />
          </button>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-[var(--sb-text)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--sb-text-muted)]">{body}</p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>
            {t("onboarding.skip")}
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
                {t("onboarding.back")}
              </Button>
            )}
            {stepIndex < total ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                {t("onboarding.next")}
              </Button>
            ) : (
              <Button size="sm" onClick={finish}>
                {t("onboarding.finish")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
