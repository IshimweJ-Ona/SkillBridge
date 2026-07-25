"use client";

import { Award, ExternalLink, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApplicationStatusPill, StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ApiError, challenges, jobs, type ApplicationStatus, type JobApplication, type SkillBadge } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

export function ApplicantDetailClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();

  const ACTIONS: Array<{ label: string; status: ApplicationStatus; variant: "primary" | "secondary" | "destructive" }> = [
    { label: t("employer.applicants.moveToReview"), status: "UNDER_REVIEW", variant: "secondary" },
    { label: t("employer.applicants.shortlist"), status: "SHORTLISTED", variant: "secondary" },
    { label: t("employer.applicants.extendOffer"), status: "OFFER_EXTENDED", variant: "primary" },
    { label: t("employer.applicants.markHired"), status: "HIRED", variant: "primary" },
    { label: t("employer.applicants.reject"), status: "REJECTED", variant: "destructive" },
  ];

  const [application, setApplication] = useState<JobApplication | null | undefined>(undefined);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [updating, setUpdating] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    let active = true;
    jobs.myApplications().then((items) => {
      if (!active) return;
      const found = items.find((item) => item.uuid === uuid) ?? null;
      setApplication(found);
      if (found?.user) {
        challenges.myBadges(found.user.uuid).then((result) => {
          if (active) setBadges(result);
        });
      }
    });
    return () => {
      active = false;
    };
  }, [uuid]);

  const handleStatusChange = async (status: ApplicationStatus) => {
    setUpdating(status);
    try {
      const updated = await jobs.updateApplicationStatus(uuid, status);
      setApplication((current) => (current ? { ...current, status: updated.status } : current));
      show({
        variant: "success",
        title: t("employer.applicants.updateSuccess"),
        description: t("employer.applicants.updateStatusDescription", { status: status.replace("_", " ").toLowerCase() }),
      });
    } catch (err) {
      show({ variant: "error", title: t("employer.applicants.updateError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUpdating(null);
    }
  };

  if (application === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (!application) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.applicants.notFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/employer/applicants")}>
          {t("employer.applicants.backToApplicants")}
        </Button>
      </Card>
    );
  }

  const profile = application.user?.profile;

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.back()} className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]">
        &larr; {t("employer.applicants.backToApplicants")}
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {application.user && <Avatar firstName={application.user.firstName} lastName={application.user.lastName} size={48} />}
            <div>
              <h1 className="text-lg font-semibold">
                {application.user ? `${application.user.firstName} ${application.user.lastName}` : t("employer.applicants.applicantFallback")}
              </h1>
              <p className="text-sm text-[var(--sb-text-muted)]">{profile?.headline ?? t("employer.applicants.headlineFallback")}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--sb-text-faint)]">
                {application.user?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {application.user.location}
                  </span>
                )}
                <span>{t("employer.applicants.appliedOn", { date: formatDate(application.submittedAt) })}</span>
                {typeof application.matchScore === "number" && (
                  <span>{t("employer.applicants.matchScore", { score: application.matchScore })}</span>
                )}
              </div>
            </div>
          </div>
          <ApplicationStatusPill status={application.status} />
        </div>

        <p className="mt-4 text-sm font-medium text-[var(--sb-text)]">{t("employer.applicants.applyingFor")}: {application.job.title}</p>

        {application.coverLetter && (
          <div className="mt-3 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
            <p className="text-xs font-medium text-[var(--sb-text-muted)]">{t("employer.applicants.coverLetter")}</p>
            <p className="mt-1 text-sm text-[var(--sb-text)]">{application.coverLetter}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant}
              disabled={application.status === action.status}
              loading={updating === action.status}
              onClick={() => handleStatusChange(action.status)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Card>

      {profile && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("employer.applicants.about")}</h2>
          <p className="mt-2 text-sm text-[var(--sb-text-muted)]">{profile.bio ?? t("employer.applicants.bioFallback")}</p>
          {profile.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <StatusPill key={skill} tone="neutral">
                  {skill}
                </StatusPill>
              ))}
            </div>
          )}
          {profile.portfolioUrl && (
            <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-xs text-[var(--sb-primary)] hover:underline">
              {t("employer.applicants.viewPortfolio")} <ExternalLink size={11} />
            </a>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold">{t("employer.applicants.verifiedBadges")}</h2>
        {badges.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--sb-text-muted)]">{t("employer.applicants.noBadges")}</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {badges.map((badge) => (
              <div key={badge.uuid} className="flex items-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]">
                  <Award size={14} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--sb-text)]">{badge.name}</p>
                  <p className="text-[10px] text-[var(--sb-text-faint)]">{t("employer.applicants.badgeScore", { score: badge.score })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
