"use client";

import { Award, Briefcase, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { admin, type AdminSummary, type EmploymentOutcomes, type SkillDemandEntry } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function AnalystDashboardPage() {
  const t = useTranslations();
  const OUTCOME_LABELS: Record<keyof Omit<EmploymentOutcomes, "placementRate">, string> = {
    submitted: t("analyst.dashboard.outcomeSubmitted"),
    underReview: t("analyst.dashboard.outcomeUnderReview"),
    shortlisted: t("analyst.dashboard.outcomeShortlisted"),
    hired: t("analyst.dashboard.outcomeHired"),
    rejected: t("analyst.dashboard.outcomeRejected"),
  };
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [outcomes, setOutcomes] = useState<EmploymentOutcomes | null>(null);
  const [skillDemand, setSkillDemand] = useState<SkillDemandEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([admin.summary(), admin.employmentOutcomes(), admin.skillDemand()]).then(
      ([summaryResult, outcomesResult, skillResult]) => {
        if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
        if (outcomesResult.status === "fulfilled") setOutcomes(outcomesResult.value);
        if (skillResult.status === "fulfilled") setSkillDemand(skillResult.value);
        setLoading(false);
      },
    );
  }, []);

  const outcomeEntries = outcomes
    ? (Object.keys(OUTCOME_LABELS) as Array<keyof typeof OUTCOME_LABELS>).map((key) => ({
        key,
        label: OUTCOME_LABELS[key],
        value: outcomes[key],
      }))
    : [];
  const maxOutcome = Math.max(1, ...outcomeEntries.map((entry) => entry.value));
  const maxSkillCount = Math.max(1, ...skillDemand.map((entry) => entry.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("analyst.dashboard.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("analyst.dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Users} label={t("analyst.dashboard.totalUsers")} value={loading ? null : summary?.totalUsers} />
        <StatTile icon={Users} label={t("analyst.dashboard.activeUsers")} value={loading ? null : summary?.activeUsers} suffix={loading ? "" : ` (${summary?.activeRate}%)`} />
        <StatTile icon={Briefcase} label={t("analyst.dashboard.openJobs")} value={loading ? null : summary?.openJobs} />
        <StatTile icon={Award} label={t("analyst.dashboard.placements")} value={loading ? null : summary?.placements} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analyst.dashboard.employmentOutcomes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <Skeleton className="h-40 w-full" />}
            {!loading && outcomes && (
              <>
                {outcomeEntries.map((entry) => (
                  <div key={entry.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--sb-text-muted)]">{entry.label}</span>
                      <span className="text-[var(--sb-text)]">{entry.value}</span>
                    </div>
                    <ProgressBar value={(entry.value / maxOutcome) * 100} className="mt-1" />
                  </div>
                ))}
                <p className="pt-2 text-xs text-[var(--sb-text-faint)]">
                  {t("analyst.dashboard.placementRate")}: <span className="font-medium text-[var(--sb-text)]">{outcomes.placementRate}%</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analyst.dashboard.topSkills")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading && <Skeleton className="h-40 w-full" />}
            {!loading && skillDemand.length === 0 && (
              <EmptyState icon={TrendingUp} title={t("analyst.dashboard.noSkillDataTitle")} description={t("analyst.dashboard.noSkillDataDescription")} />
            )}
            {!loading &&
              skillDemand.slice(0, 8).map((entry) => (
                <div key={entry.skill}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--sb-text-muted)]">{entry.skill}</span>
                    <span className="text-[var(--sb-text)]">{entry.count}</span>
                  </div>
                  <ProgressBar value={(entry.count / maxSkillCount) * 100} className="mt-1" />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Users;
  label: string;
  value: number | null | undefined;
  suffix?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[var(--sb-text-faint)]">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--sb-text)]">
        {value === null || value === undefined ? <Skeleton className="h-7 w-10" /> : `${value}${suffix ?? ""}`}
      </p>
    </Card>
  );
}
