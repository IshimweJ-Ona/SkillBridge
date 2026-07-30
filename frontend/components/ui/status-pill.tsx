import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

// A neutral pill + a small colored dot, rather than a solid pastel-fill
// badge - the fill-badge look is the single most common "generic AI/template
// UI" tell. The dot still carries the color meaning; the pill itself stays
// on-brand (matches every other neutral surface in the app).
const DOT_CLASSES: Record<Tone, string> = {
  success: "bg-[var(--sb-success)]",
  warning: "bg-[var(--sb-warning)]",
  danger: "bg-[var(--sb-danger)]",
  info: "bg-[var(--sb-info)]",
  neutral: "bg-[var(--sb-text-faint)]",
};

export function StatusPill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[var(--sb-bg-inset)] px-2.5 py-1 text-[11px] font-medium text-[var(--sb-text-muted)] ring-1 ring-inset ring-[var(--sb-border)]",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} />
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
