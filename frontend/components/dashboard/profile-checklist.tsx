import { Check, Circle } from "@/lib/icons";
import type { Profile } from "@/lib/api";

export function profileChecks(profile: Profile) {
  return [
    { label: "Basic Information", done: Boolean(profile.headline && profile.bio) },
    { label: "Skills Added", done: profile.skills.length > 0 },
    { label: "Portfolio / CV Added", done: Boolean(profile.portfolioUrl || profile.cvUrl) },
    { label: "Profile Picture", done: Boolean(profile.avatarUrl) },
    { label: "About You", done: Boolean(profile.bio) },
  ];
}

export function ProfileChecklist({ profile }: { profile: Profile }) {
  const checks = profileChecks(profile);

  return (
    <ul className="space-y-2">
      {checks.map((check) => (
        <li key={check.label} className="flex items-center gap-2.5 text-xs">
          <span
            className={
              check.done
                ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-success)] text-white"
                : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--sb-border-strong)] text-[var(--sb-text-faint)]"
            }
          >
            {check.done ? <Check size={12} /> : <Circle size={10} />}
          </span>
          <span className={check.done ? "text-[var(--sb-text-muted)] line-through" : "text-[var(--sb-text)]"}>
            {check.label}
          </span>
          {!check.done && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--sb-bg-inset)] px-2 py-0.5 text-[10px] font-medium text-[var(--sb-text-muted)] ring-1 ring-inset ring-[var(--sb-border)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--sb-warning)]" />
              In Progress
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
