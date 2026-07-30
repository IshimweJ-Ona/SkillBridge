"use client";

import { Search, SlidersHorizontal } from "@/lib/icons";
import { useEffect, useState } from "react";
import { UndrawJobHunt } from "react-undraw-illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/dashboard/job-card";
import { jobs, type JobPosting } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function JobsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await jobs.list({ search: search || undefined, limit: 20 });
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
        <h1 className="text-xl font-semibold">{t("jobs.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("jobs.subtitle")}</p>
      </div>

      <div className="flex gap-2">
        <Input
          leadingIcon={<Search size={15} />}
          placeholder={t("jobs.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1"
        />
        <button
          type="button"
          className="flex h-10 shrink-0 items-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] px-3 text-sm text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)]"
        >
          <SlidersHorizontal size={14} /> {t("common.filters")}
        </button>
      </div>

      <div className="space-y-3">
        {loading &&
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
        {!loading && items.length === 0 && (
          <EmptyState illustration={UndrawJobHunt} title={t("jobs.noJobsTitle")} description={t("jobs.noJobsDescription")} />
        )}
        {!loading && items.map((job) => <JobCard key={job.uuid} job={job} />)}
      </div>
    </div>
  );
}
