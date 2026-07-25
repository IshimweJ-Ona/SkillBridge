"use client";

import { Bookmark, MapPin } from "lucide-react";
import Link from "next/link";
import type { JobPosting } from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { useSavedJobs } from "@/lib/use-saved-jobs";

export function JobCard({ job, matchScore }: { job: JobPosting; matchScore?: number }) {
  const { isSaved, toggle } = useSavedJobs();
  const saved = isSaved(job.uuid);

  return (
    <div className="flex items-start gap-3 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-4 transition-colors hover:border-[var(--sb-border-strong)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-white/5 text-xs font-semibold text-[var(--sb-text-muted)]">
        {job.company.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/jobs/${job.uuid}`} className="text-sm font-semibold text-[var(--sb-text)] hover:text-[var(--sb-primary)]">
              {job.title}
            </Link>
            <p className="text-xs text-[var(--sb-text-muted)]">{job.company.name}</p>
          </div>
          <button
            type="button"
            onClick={() => toggle(job.uuid)}
            aria-label={saved ? "Remove from saved jobs" : "Save job"}
            aria-pressed={saved}
            className={cn("shrink-0 text-[var(--sb-text-faint)] hover:text-[var(--sb-primary)]", saved && "text-[var(--sb-primary)]")}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--sb-text-faint)]">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {job.location}
            </span>
          )}
          {job.compensationRange && <span>{job.compensationRange}</span>}
          <span>{formatRelativeTime(job.createdAt)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {typeof matchScore === "number" && <StatusPill tone="success">{matchScore}% match</StatusPill>}
          {job.requiredSkills.slice(0, 3).map((skill) => (
            <StatusPill key={skill} tone="neutral">
              {skill}
            </StatusPill>
          ))}
        </div>
      </div>
    </div>
  );
}
