"use client";

import { Star } from "@/lib/icons";
import { UndrawChatting } from "react-undraw-illustrations";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { feedback, type Feedback, type FeedbackSummary } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

const STATUS_TONE = {
  NEW: "info",
  IN_REVIEW: "warning",
  ACTIONED: "success",
  ARCHIVED: "neutral",
} as const;

export default function FeedbackAnalysisPage() {
  const t = useTranslations();
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([feedback.summary(), feedback.list({ limit: 10 })]).then(([summaryResult, listResult]) => {
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      if (listResult.status === "fulfilled") setItems(listResult.value.items);
      setLoading(false);
    });
  }, []);

  const maxAudienceCount = Math.max(1, ...(summary?.byAudience.map((a) => a.count) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("analyst.feedback.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("analyst.feedback.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 text-center lg:col-span-1">
          <p className="text-xs text-[var(--sb-text-faint)]">{t("analyst.feedback.averageRating")}</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <Star size={22} className="text-[var(--sb-warning)]" fill="currentColor" />
            <span className="text-3xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : summary?.averageRating ?? "-"}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("analyst.feedback.outOf5", { count: summary?.total ?? 0 })}</p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("analyst.feedback.byStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t("analyst.feedback.new"), value: summary?.new },
              { label: t("analyst.feedback.inReview"), value: summary?.inReview },
              { label: t("analyst.feedback.actioned"), value: summary?.actioned },
              { label: t("analyst.feedback.archived"), value: summary?.archived },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-bold text-[var(--sb-text)]">{loading ? <Skeleton className="h-6 w-8" /> : (stat.value ?? 0)}</p>
                <p className="text-xs text-[var(--sb-text-faint)]">{stat.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analyst.feedback.byAudience")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <Skeleton className="h-20 w-full" />}
          {!loading &&
            summary?.byAudience.map((entry) => (
              <div key={entry.audience}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--sb-text-muted)]">{entry.audience}</span>
                  <span className="text-[var(--sb-text)]">{entry.count}</span>
                </div>
                <ProgressBar value={(entry.count / maxAudienceCount) * 100} className="mt-1" />
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("analyst.feedback.recentFeedback")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && items.length === 0 && (
            <EmptyState illustration={UndrawChatting} title={t("analyst.feedback.noFeedbackTitle")} description={t("analyst.feedback.noFeedbackDescription")} />
          )}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.uuid} className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--sb-text)]">{item.subject}</p>
                  <StatusPill tone={STATUS_TONE[item.status]}>{item.status.replace("_", " ")}</StatusPill>
                </div>
                <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{item.message}</p>
                <p className="mt-2 text-[10px] text-[var(--sb-text-faint)]">
                  {item.audience} · {item.user ? `${item.user.firstName} ${item.user.lastName}` : t("analyst.feedback.anonymous")} · {formatDate(item.createdAt)}
                  {typeof item.rating === "number" && ` · ${item.rating}/5`}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
