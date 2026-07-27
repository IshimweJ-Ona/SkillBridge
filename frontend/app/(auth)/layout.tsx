"use client";

import { Briefcase, ShieldCheck, TrendingUp } from "lucide-react";
import { Logo, LOGO_SRC } from "@/components/brand/logo";
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
      <aside className="relative hidden w-[440px] shrink-0 flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(216,27,61,0.28),transparent_50%),radial-gradient(circle_at_90%_85%,rgba(230,165,60,0.14),transparent_45%),linear-gradient(170deg,#141017,#050406)] p-10 lg:flex">
        {/* faint oversized logo watermark, echoes the badge without competing with the copy */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-[0.07] blur-sm"
          style={{
            backgroundImage: `url('${LOGO_SRC}')`,
            backgroundSize: "cover",
          }}
        />
        <Logo size={34} />
        <div className="relative">
          <span className="inline-flex items-center rounded-full border border-[var(--sb-border-strong)] bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--sb-text-muted)]">
            {t("auth.badge")}
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--sb-text)]">
            {t("auth.tagline1")}
            <br />
            <span className="bg-gradient-to-r from-[var(--sb-primary-hover)] to-[var(--sb-accent)] bg-clip-text text-transparent">
              {t("auth.tagline2")}
            </span>
          </h1>
          <div className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.6rem] bg-[var(--sb-primary-soft)] text-[var(--sb-primary)] ring-1 ring-[var(--sb-primary)]/20">
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
        <p className="relative text-xs text-[var(--sb-text-faint)]">{t("auth.footer")}</p>
      </aside>
      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--sb-bg)] px-4 py-10">
        <div className="mb-6 lg:hidden">
          <Logo size={34} />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
