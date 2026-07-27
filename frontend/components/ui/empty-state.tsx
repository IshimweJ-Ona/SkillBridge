import type { ComponentType } from "react";
import type { LucideIcon } from "@/lib/icons";

// react-undraw-illustrations components (see types/react-undraw-illustrations.d.ts
// for why this is untyped) - primaryColor/height are the only props every
// illustration in that package consistently supports.
type Illustration = ComponentType<{ primaryColor?: string; height?: string; className?: string }>;

export function EmptyState({
  icon: Icon,
  illustration: Picture,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  illustration?: Illustration;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border-strong)] bg-[var(--sb-bg-panel)]/40 px-6 py-10 text-center">
      {Picture ? (
        // Hardcoded hex, not var(--sb-primary) - passed as an SVG
        // presentation attribute inside the illustration, where CSS custom
        // properties aren't reliably resolved across browsers.
        <Picture primaryColor="#d81b3d" height="140px" className="mb-1" />
      ) : Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]">
          <Icon size={20} />
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium text-[var(--sb-text)]">{title}</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--sb-text-muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
