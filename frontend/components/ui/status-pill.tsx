import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-[var(--sb-success-soft)] text-[var(--sb-success)]",
  warning: "bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]",
  danger: "bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]",
  info: "bg-[var(--sb-info-soft)] text-[var(--sb-info)]",
  neutral: "bg-white/5 text-[var(--sb-text-muted)]",
};

export function StatusPill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
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
