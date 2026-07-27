"use client";

import { Bookmark, ExternalLink, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError, jobs, type JobApplication, type JobPosting } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { useSavedJobs } from "@/lib/use-saved-jobs";
import { cn, formatDate } from "@/lib/utils";

export function JobDetailClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { isSaved, toggle } = useSavedJobs();
  const t = useTranslations();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [existingApplication, setExistingApplication] = useState<JobApplication | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [jobResult, applicationsResult] = await Promise.all([jobs.get(uuid), jobs.myApplications()]);
        if (!active) return;
        setJob(jobResult);
        setExistingApplication(applicationsResult.find((app) => app.job.uuid === uuid) ?? null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [uuid]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const application = await jobs.apply(uuid, { coverLetter: coverLetter || undefined });
      setExistingApplication(application);
      show({ variant: "success", title: t("jobs.applySuccessTitle"), description: t("jobs.applySuccessDescription") });
    } catch (err) {
      show({
        variant: "error",
        title: t("jobs.applyErrorTitle"),
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--sb-text-muted)]">{t("jobs.notFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/jobs")}>
          {t("jobs.backToJobs")}
        </Button>
      </Card>
    );
  }

  const saved = isSaved(job.uuid);

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.back()} className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]">
        &larr; {t("jobs.backToJobs")}
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-white/5 text-sm font-semibold text-[var(--sb-text-muted)]">
              {job.company.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-semibold">{job.title}</h1>
              <p className="text-sm text-[var(--sb-text-muted)]">{job.company.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--sb-text-faint)]">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {job.location}
                  </span>
                )}
                {job.compensationRange && <span>{job.compensationRange}</span>}
                {job.deadline && <span>{formatDate(job.deadline)}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggle(job.uuid)}
            aria-pressed={saved}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] text-[var(--sb-text-faint)] hover:text-[var(--sb-primary)]",
              saved && "text-[var(--sb-primary)]",
            )}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.requiredSkills.map((skill) => (
            <StatusPill key={skill} tone="neutral">
              {skill}
            </StatusPill>
          ))}
        </div>

        {job.preScreenChallenge && (
          <div className="mt-5 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-4">
            <p className="text-sm font-medium text-[var(--sb-text)]">{t("jobs.preScreenRequiredTitle")}</p>
            <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("jobs.preScreenRequiredBody")}</p>
            <a
              href={`/learning-hub/${job.preScreenChallenge.uuid}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--sb-radius-md)] bg-[var(--sb-primary)] px-4 py-2 text-sm font-medium text-[var(--sb-primary-foreground)] hover:bg-[var(--sb-primary-hover)]"
            >
              {t("jobs.preScreenTakeTest")} <ExternalLink size={14} />
            </a>
          </div>
        )}

        {existingApplication ? (
          <div className="mt-5 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-4">
            <p className="text-sm font-medium text-[var(--sb-text)]">{t("jobs.alreadyApplied")}</p>
            <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
              {t("jobs.trackStatus")}{" "}
              <a href="/applications" className="text-[var(--sb-primary)] hover:underline">
                {t("nav.youth.myApplications")}
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <Textarea
              label={t("jobs.coverLetterLabel")}
              placeholder={t("jobs.coverLetterPlaceholder")}
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
            />
            <Button onClick={handleApply} loading={applying} size="lg">
              {t("jobs.applyNow")}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">{t("jobs.overview")}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-[var(--sb-text-muted)]">{job.description}</p>
      </Card>
    </div>
  );
}
