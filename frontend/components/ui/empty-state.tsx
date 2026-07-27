import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border-strong)] bg-[var(--sb-bg-panel)]/40 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--sb-text)]">{title}</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--sb-text-muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
