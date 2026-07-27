import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Avatar({
  firstName,
  lastName,
  size = 36,
  className,
}: {
  firstName: string;
  lastName: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sb-primary-hover)] to-[var(--sb-primary-active)] font-semibold text-white shadow-[0_2px_8px_-1px_var(--sb-primary-glow)] ring-2 ring-[var(--sb-bg-panel)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
