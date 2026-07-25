"use client";

import { Briefcase, ShieldCheck, TrendingUp } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useTranslations } from "@/lib/i18n/context";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();

  const FEATURES = [
    { icon: Briefcase, title: t("auth.feature1Title"), description: t("auth.feature1Description") },
    { icon: TrendingUp, title: t("auth.feature2Title"), description: t("auth.feature2Description") },
    { icon: ShieldCheck, title: t("auth.feature3Title"), description: t("auth.feature3Description") },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(228,41,63,0.25),transparent_55%),linear-gradient(160deg,#0d0d10,#050506)] p-10 lg:flex">
        <Logo />
        <div>
          <h1 className="text-3xl font-bold leading-tight text-[var(--sb-text)]">
            {t("auth.tagline1")}
            <br />
            <span className="text-[var(--sb-primary)]">{t("auth.tagline2")}</span>
          </h1>
          <div className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]">
                  <feature.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--sb-text)]">{feature.title}</p>
                  <p className="text-xs text-[var(--sb-text-muted)]">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--sb-text-faint)]">{t("auth.footer")}</p>
      </aside>
      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--sb-bg)] px-4 py-10">
        <div className="mb-6 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
