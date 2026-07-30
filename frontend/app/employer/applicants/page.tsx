"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { UndrawTeam } from "react-undraw-illustrations";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ApplicationStatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { jobs, type ApplicationStatus, type JobApplication } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

function ApplicantsContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const jobUuid = searchParams.get("jobUuid");

  const FILTERS: Array<{ label: string; value: ApplicationStatus | "ALL" }> = [
    { label: t("employer.applicants.filterAll"), value: "ALL" },
    { label: t("employer.applicants.filterUnderReview"), value: "UNDER_REVIEW" },
    { label: t("employer.applicants.filterInterview"), value: "SHORTLISTED" },
    { label: t("employer.applicants.filterAccepted"), value: "HIRED" },
    { label: t("employer.applicants.filterRejected"), value: "REJECTED" },
  ];

  const [items, setItems] = useState<JobApplication[] | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | "ALL">("ALL");

  useEffect(() => {
    jobs.myApplications().then(setItems);
  }, []);

  const filtered = (items ?? [])
    .filter((app) => !jobUuid || app.job.uuid === jobUuid)
    .filter((app) => filter === "ALL" || app.status === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("employer.applicants.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">
          {jobUuid ? t("employer.applicants.subtitleFiltered") : t("employer.applicants.subtitleAll")}
        </p>
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
        {items === null && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}
        {items !== null && filtered.length === 0 && (
          <EmptyState illustration={UndrawTeam} title={t("employer.applicants.noApplicantsTitle")} description={t("employer.applicants.noApplicantsDescription")} />
        )}
        {items !== null &&
          filtered.map((application) => (
            <Link key={application.uuid} href={`/employer/applicants/${application.uuid}`}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-[var(--sb-border-strong)]">
                <div className="flex items-center gap-3">
                  {application.user && (
                    <Avatar
                      firstName={application.user.firstName}
                      lastName={application.user.lastName}
                      imageUrl={application.user.profile?.avatarUrl}
                      size={36}
                      clickable
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--sb-text)]">
                      {application.user ? `${application.user.firstName} ${application.user.lastName}` : t("employer.applicants.applicantFallback")}
                    </p>
                    <p className="text-xs text-[var(--sb-text-muted)]">{application.job.title}</p>
                    <p className="text-[10px] text-[var(--sb-text-faint)]">
                      {t("employer.applicants.appliedOn", { date: formatDate(application.submittedAt) })}
                    </p>
                  </div>
                </div>
                <ApplicationStatusPill status={application.status} />
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense>
      <ApplicantsContent />
    </Suspense>
  );
}
