"use client";

import { Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { ApplicationStatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { jobs, type ApplicationStatus, type JobApplication } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

export default function ApplicationsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<JobApplication[]>([]);
  const [filter, setFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  const FILTERS: Array<{ label: string; value: ApplicationStatus | "ALL" }> = [
    { label: t("applications.filterAll"), value: "ALL" },
    { label: t("applications.filterUnderReview"), value: "UNDER_REVIEW" },
    { label: t("applications.filterInterview"), value: "SHORTLISTED" },
    { label: t("applications.filterAccepted"), value: "HIRED" },
    { label: t("applications.filterRejected"), value: "REJECTED" },
  ];

  useEffect(() => {
    let active = true;
    jobs
      .myApplications()
      .then((result) => {
        if (active) setItems(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = filter === "ALL" ? items : items.filter((app) => app.status === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("applications.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("applications.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.value
                ? "border-[var(--sb-primary)] bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]"
                : "border-[var(--sb-border)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title={t("applications.noApplicationsTitle")}
            description={t("applications.noApplicationsDescription")}
            action={<LinkButton href="/jobs" size="sm">{t("applications.findJobs")}</LinkButton>}
          />
        )}
        {!loading &&
          filtered.map((application) => (
            <Card key={application.uuid} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-white/5 text-xs font-semibold text-[var(--sb-text-muted)]">
                  {application.job.company.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--sb-text)]">{application.job.title}</p>
                  <p className="text-xs text-[var(--sb-text-muted)]">{application.job.company.name}</p>
                  <p className="text-[10px] text-[var(--sb-text-faint)]">{t("applications.appliedOn")} {formatDate(application.submittedAt)}</p>
                </div>
              </div>
              <ApplicationStatusPill status={application.status} />
            </Card>
          ))}
      </div>
    </div>
  );
}
