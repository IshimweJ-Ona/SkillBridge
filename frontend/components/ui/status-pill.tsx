import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-[var(--sb-success-soft)] text-[var(--sb-success)] ring-1 ring-inset ring-[var(--sb-success)]/20",
  warning: "bg-[var(--sb-warning-soft)] text-[var(--sb-warning)] ring-1 ring-inset ring-[var(--sb-warning)]/20",
  danger: "bg-[var(--sb-danger-soft)] text-[var(--sb-danger)] ring-1 ring-inset ring-[var(--sb-danger)]/20",
  info: "bg-[var(--sb-info-soft)] text-[var(--sb-info)] ring-1 ring-inset ring-[var(--sb-info)]/20",
  neutral: "bg-white/[0.04] text-[var(--sb-text-muted)] ring-1 ring-inset ring-white/10",
};

export function StatusPill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const APPLICATION_STATUS_TONE: Record<string, Tone> = {
  SUBMITTED: "neutral",
  UNDER_REVIEW: "warning",
  SHORTLISTED: "info",
  OFFER_EXTENDED: "success",
  HIRED: "success",
  REJECTED: "danger",
};

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Interview",
  OFFER_EXTENDED: "Offer Extended",
  HIRED: "Accepted",
  REJECTED: "Rejected",
};

export function ApplicationStatusPill({ status }: { status: string }) {
  return (
    <StatusPill tone={APPLICATION_STATUS_TONE[status] ?? "neutral"}>
      {APPLICATION_STATUS_LABEL[status] ?? status}
    </StatusPill>
  );
}
