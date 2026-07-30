"use client";

import { GraduationCap, Loader2, Plus } from "@/lib/icons";
import { useEffect, useState } from "react";
import { UndrawGraduation } from "react-undraw-illustrations";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { StatusPill } from "@/components/ui/status-pill";
import { challenges, companies, type SkillChallenge } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function EmployerSkillTestsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<SkillChallenge[] | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const myCompanies = await companies.mine();
      const own = myCompanies[0];
      if (!own) {
        if (active) setItems([]);
        return;
      }
      const response = await challenges.list({ companyUuid: own.uuid, limit: 50 });
      if (active) setItems(response.items);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("employer.skillTests.title")}</h1>
          <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.skillTests.subtitle")}</p>
        </div>
        <LinkButton href="/employer/skill-tests/new" size="sm">
          <Plus size={14} /> {t("employer.skillTests.newTest")}
        </LinkButton>
      </div>

      {items === null && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
        </div>
      )}

      {items !== null && items.length === 0 && (
        <EmptyState
          illustration={UndrawGraduation}
          title={t("employer.skillTests.noTestsTitle")}
          description={t("employer.skillTests.noTestsDescription")}
        />
      )}

      {items !== null && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((challenge) => (
            <Card key={challenge.uuid} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} className="text-[var(--sb-text-faint)]" />
                  <p className="text-sm font-semibold text-[var(--sb-text)]">{challenge.title}</p>
                </div>
                <StatusPill tone={challenge.status === "PUBLISHED" ? "success" : "neutral"}>{challenge.status}</StatusPill>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-[var(--sb-text-muted)]">{challenge.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--sb-text-faint)]">
                <StatusPill tone="neutral">{challenge.skillCategory}</StatusPill>
                <span>{challenge.questions?.length ?? 0} {t("employer.skillTests.questionsCount")}</span>
                <span>{t("employer.skillTests.passLabel")}: {challenge.passingScore}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
