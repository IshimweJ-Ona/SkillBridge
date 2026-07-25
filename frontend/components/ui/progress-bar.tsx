import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  trackClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", trackClassName)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-[var(--sb-primary)] to-[var(--sb-primary-hover)] transition-[width] duration-300",
          className,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            index < step ? "bg-[var(--sb-primary)]" : "bg-white/10",
          )}
        />
      ))}
      <span className="ml-2 shrink-0 text-xs text-[var(--sb-text-muted)]">
        Step {step} of {total}
      </span>
    </div>
  );
}
