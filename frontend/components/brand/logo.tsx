import { cn } from "@/lib/utils";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[var(--sb-primary-hover)] to-[var(--sb-primary-active)] text-xs text-white">
        SB
      </span>
      {!mark && (
        <span className="text-[var(--sb-text)]">
          SkillBridge<span className="text-[var(--sb-primary)]">.</span>
        </span>
      )}
    </span>
  );
}
