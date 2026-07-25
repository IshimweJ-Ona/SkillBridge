import { Check, Circle } from "lucide-react";
import type { Profile } from "@/lib/api";

export function profileChecks(profile: Profile) {
  return [
    { label: "Basic Information", done: Boolean(profile.headline && profile.bio) },
    { label: "Skills Added", done: profile.skills.length > 0 },
    { label: "Portfolio / CV Added", done: Boolean(profile.portfolioUrl || profile.cvUrl) },
    { label: "Profile Picture", done: false },
    { label: "About You", done: Boolean(profile.bio) },
  ];
}

export function ProfileChecklist({ profile }: { profile: Profile }) {
  const checks = profileChecks(profile);

  return (
    <ul className="space-y-2">
      {checks.map((check) => (
        <li key={check.label} className="flex items-center gap-2 text-xs">
          {check.done ? (
            <Check size={14} className="text-[var(--sb-success)]" />
          ) : (
            <Circle size={14} className="text-[var(--sb-text-faint)]" />
          )}
          <span className={check.done ? "text-[var(--sb-text-muted)] line-through" : "text-[var(--sb-text)]"}>
            {check.label}
          </span>
          {!check.done && <span className="ml-auto text-[10px] text-[var(--sb-warning)]">In Progress</span>}
        </li>
      ))}
    </ul>
  );
}
