import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sb-skeleton overflow-hidden rounded-[var(--sb-radius-sm)]", className)} />;
}
