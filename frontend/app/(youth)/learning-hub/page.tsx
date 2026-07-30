"use client";

import { Clock, Search } from "@/lib/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UndrawGraduation } from "react-undraw-illustrations";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { challenges, type SkillChallenge } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

const DIFFICULTY_TONE = {
  BEGINNER: "success",
  INTERMEDIATE: "warning",
  ADVANCED: "danger",
} as const;

export default function LearningHubPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SkillChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await challenges.list({ search: search || undefined });
        if (active) setItems(response.items);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("learningHub.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("learningHub.subtitle")}</p>
      </div>

      <Input
        leadingIcon={<Search size={15} />}
        placeholder={t("learningHub.searchPlaceholder")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading && Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40 w-full" />)}
        {!loading && items.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState illustration={UndrawGraduation} title={t("learningHub.noChallengesTitle")} description={t("learningHub.noChallengesDescription")} />
          </div>
        )}
        {!loading &&
          items.map((challenge) => (
            <Link key={challenge.uuid} href={`/learning-hub/${challenge.uuid}`}>
              <Card className="h-full p-4 transition-colors hover:border-[var(--sb-border-strong)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--sb-text)]">{challenge.title}</p>
                    <p className="text-xs text-[var(--sb-text-muted)]">{challenge.company?.name}</p>
                  </div>
                  <StatusPill tone={DIFFICULTY_TONE[challenge.difficulty]}>{challenge.difficulty}</StatusPill>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-[var(--sb-text-muted)]">{challenge.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill tone="neutral">{challenge.skillCategory}</StatusPill>
                  <span className="flex items-center gap-1 text-[11px] text-[var(--sb-text-faint)]">
                    <Clock size={11} /> {challenge.durationMinutes} {t("learningHub.minutes")}
                  </span>
                  <span className="text-[11px] text-[var(--sb-text-faint)]">{t("learningHub.passLabel")}: {challenge.passingScore}%</span>
                </div>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
