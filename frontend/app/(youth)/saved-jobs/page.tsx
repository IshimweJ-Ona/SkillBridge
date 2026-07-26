"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/dashboard/job-card";
import { jobs, type JobPosting } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { useSavedJobs } from "@/lib/use-saved-jobs";

export default function SavedJobsPage() {
  const t = useTranslations();
  const { saved } = useSavedJobs();
  const [items, setItems] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(saved.map((uuid) => jobs.get(uuid).catch(() => null)))
      .then((results) => {
        if (active) setItems(results.filter((job): job is JobPosting => job !== null));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [saved]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("savedJobs.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("savedJobs.subtitle")}</p>
      </div>

      <div className="space-y-3">
        {loading && Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
        {!loading && items.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title={t("savedJobs.noSavedTitle")}
            description={t("savedJobs.noSavedDescription")}
            action={<LinkButton href="/jobs" size="sm">{t("savedJobs.browseJobs")}</LinkButton>}
          />
        )}
        {!loading && items.map((job) => <JobCard key={job.uuid} job={job} />)}
      </div>
    </div>
  );
}
