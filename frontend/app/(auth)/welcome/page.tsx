"use client";

import { BarChart3, Briefcase, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
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
              "flex items-center gap-3 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-4 transition-colors",
              role.available
                ? "hover:border-[var(--sb-primary)]/60 hover:bg-[var(--sb-bg-panel-hover)]"
                : "pointer-events-none opacity-50",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]">
              <role.icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--sb-text)]">{role.label}</p>
              <p className="text-xs text-[var(--sb-text-muted)]">{role.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
