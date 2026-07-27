"use client";

import { Briefcase, Building2, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplicationStatusPill } from "@/components/ui/status-pill";
import { LinkButton } from "@/components/ui/link-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { companies, jobs, type ApplicationStatus, type Company, type JobApplication, type JobPosting } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_ORDER: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "OFFER_EXTENDED",
  "HIRED",
  "REJECTED",
];

export default function EmployerDashboardPage() {
  const { user } = useAuth();
  const t = useTranslations();
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);
  const [myJobs, setMyJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    Promise.allSettled([companies.mine(), jobs.myJobs(), jobs.myApplications()]).then(
      ([companyResult, jobResult, applicationResult]) => {
        if (!active) return;
        if (companyResult.status === "fulfilled") setMyCompanies(companyResult.value);
        if (jobResult.status === "fulfilled") setMyJobs(jobResult.value);
        if (applicationResult.status === "fulfilled") setApplications(applicationResult.value);
        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  if (!loading && myCompanies.length === 0) {
    return (
      <Card className="mx-auto max-w-lg p-8">
        <EmptyState
          icon={Building2}
          title={t("employer.dashboard.setupTitle")}
          description={t("employer.dashboard.setupDescription")}
          action={
            <LinkButton href="/employer/company" size="sm">
              {t("employer.dashboard.createCompany")}
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const activeJobs = myJobs.filter((job) => job.status === "OPEN").length;
  const shortlisted = applications.filter((app) => app.status === "SHORTLISTED").length;
  const hired = applications.filter((app) => app.status === "HIRED").length;
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: applications.filter((app) => app.status === status).length,
  }));
  const maxCount = Math.max(1, ...statusCounts.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("employer.dashboard.welcome", { name: myCompanies[0]?.name ?? user.firstName })}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Briefcase} label={t("employer.dashboard.activeJobs")} value={loading ? null : activeJobs} />
        <StatTile icon={Users} label={t("employer.dashboard.totalApplicants")} value={loading ? null : applications.length} />
        <StatTile icon={CheckCircle2} label={t("employer.dashboard.interviews")} value={loading ? null : shortlisted} />
        <StatTile icon={CheckCircle2} label={t("employer.dashboard.hires")} value={loading ? null : hired} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("employer.dashboard.recentApplications")}</CardTitle>
              <Link href="/employer/applicants" className="text-xs text-[var(--sb-primary)] hover:underline">
                {t("common.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              )}
              {!loading && applications.length === 0 && (
                <EmptyState icon={Users} title={t("employer.dashboard.noApplicantsTitle")} description={t("employer.dashboard.noApplicantsDescription")} />
              )}
              {!loading &&
                applications.slice(0, 5).map((application) => (
                  <Link
                    key={application.uuid}
                    href={`/employer/applicants/${application.uuid}`}
                    className="flex items-center justify-between rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] px-3 py-2.5 text-xs hover:bg-[var(--sb-bg-panel-hover)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--sb-text)]">
                        {application.job.title}
                      </p>
                      <p className="text-[var(--sb-text-faint)]">{formatRelativeTime(application.submittedAt)}</p>
                    </div>
                    <ApplicationStatusPill status={application.status} />
                  </Link>
                ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("employer.dashboard.applicationsByStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusCounts.map(({ status, count }) => (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--sb-text-muted)]">{status.replace("_", " ")}</span>
                    <span className="text-[var(--sb-text)]">{count}</span>
                  </div>
                  <ProgressBar value={(count / maxCount) * 100} className="mt-1" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("employer.dashboard.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <LinkButton href="/employer/jobs/new" className="w-full" size="sm">
                {t("employer.dashboard.postNewJob")}
              </LinkButton>
              <LinkButton href="/employer/applicants" variant="secondary" className="w-full" size="sm">
                {t("employer.dashboard.viewAllApplicants")}
              </LinkButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number | null;
}) {
  return (
    <Card className="p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-md)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-[0.55rem] bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]">
        <Icon size={15} />
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--sb-text)]">
        {value === null ? <Skeleton className="h-7 w-10" /> : value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--sb-text-faint)]">{label}</p>
    </Card>
  );
}
