"use client";

import { ArrowRight, BarChart3, Briefcase, ShieldCheck, UserRound } from "@/lib/icons";
import Link from "next/link";
import { LOGO_SRC } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/context";

export default function WelcomePage() {
  const t = useTranslations();

  const ROLES = [
    {
      key: "youth",
      label: t("welcome.youthLabel"),
      description: t("welcome.youthDescription"),
      icon: UserRound,
      href: "/sign-in?role=youth",
      available: true,
    },
    {
      key: "employer",
      label: t("welcome.employerLabel"),
      description: t("welcome.employerDescription"),
      icon: Briefcase,
      href: "/sign-in?role=employer",
      available: true,
    },
    {
      key: "analyst",
      label: t("welcome.analystLabel"),
      description: t("welcome.analystDescription"),
      icon: BarChart3,
      href: "/sign-in",
      available: true,
    },
    {
      key: "administrator",
      label: t("welcome.adminLabel"),
      description: t("welcome.adminDescription"),
      icon: ShieldCheck,
      href: "/sign-in",
      available: true,
    },
  ];

  return (
    <div className="sb-fade-in">
      <div className="mb-6 flex justify-center lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt="SkillBridge"
          className="h-16 w-16 rounded-2xl shadow-[0_4px_20px_-4px_var(--sb-primary-glow)] ring-1 ring-[var(--sb-border-strong)]"
        />
      </div>

      <h1 className="text-2xl font-bold leading-tight text-[var(--sb-text)]">{t("welcome.missionTitle")}</h1>
      <p className="mt-3 text-sm text-[var(--sb-text-muted)]">{t("welcome.missionBody")}</p>

      <div className="mt-8 border-t border-[var(--sb-border)] pt-6">
        <h2 className="text-xl font-semibold text-[var(--sb-text)]">{t("welcome.title")}</h2>
        <p className="mt-1 text-sm text-[var(--sb-text-muted)]">{t("welcome.subtitle")}</p>
      </div>

      <div className="mt-6 space-y-3">
        {ROLES.map((role) => (
          <Link
            key={role.key}
            href={role.href}
            aria-disabled={!role.available}
            className={cn(
              "group flex items-center gap-3 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-4 shadow-[var(--sb-shadow-sm)] transition-all",
              role.available
                ? "hover:-translate-y-0.5 hover:border-[var(--sb-primary)]/50 hover:bg-[var(--sb-bg-panel-hover)] hover:shadow-[var(--sb-shadow-md)]"
                : "pointer-events-none opacity-50",
            )}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.65rem] bg-[var(--sb-primary-soft)] text-[var(--sb-primary)] ring-1 ring-[var(--sb-primary)]/20">
              <role.icon size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--sb-text)]">{role.label}</p>
              <p className="text-xs text-[var(--sb-text-muted)]">{role.description}</p>
            </div>
            <ArrowRight
              size={16}
              className="shrink-0 text-[var(--sb-text-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--sb-primary)]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
