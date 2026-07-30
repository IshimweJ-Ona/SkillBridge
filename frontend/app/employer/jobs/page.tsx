"use client";

import { MapPin } from "@/lib/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UndrawJobHunt } from "react-undraw-illustrations";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { jobs, type JobPosting } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

export default function EmployerJobsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<JobPosting[] | null>(null);

  useEffect(() => {
    jobs.myJobs().then(setItems);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("employer.jobs.title")}</h1>
          <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.jobs.subtitle")}</p>
        </div>
        <LinkButton href="/employer/jobs/new" size="sm">
          {t("employer.jobs.postNewJob")}
        </LinkButton>
      </div>

      <div className="space-y-3">
        {items === null && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}
        {items !== null && items.length === 0 && (
          <EmptyState
            illustration={UndrawJobHunt}
            title={t("employer.jobs.noJobsTitle")}
            description={t("employer.jobs.noJobsDescription")}
            action={<LinkButton href="/employer/jobs/new" size="sm">{t("employer.jobs.postNewJob")}</LinkButton>}
          />
        )}
        {items !== null &&
          items.map((job) => (
            <Card key={job.uuid} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-[var(--sb-text)]">{job.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--sb-text-faint)]">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {job.location}
                    </span>
                  )}
                  <span>{t("employer.jobs.posted")} {formatDate(job.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill tone={job.status === "OPEN" ? "success" : "neutral"}>{job.status}</StatusPill>
                <Link href={`/employer/applicants?jobUuid=${job.uuid}`} className="text-xs text-[var(--sb-primary)] hover:underline">
                  {t("employer.jobs.viewApplicants")}
                </Link>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
