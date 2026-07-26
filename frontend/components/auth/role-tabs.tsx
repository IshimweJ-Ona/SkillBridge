"use client";

import { cn } from "@/lib/utils";

export type AuthRole = "YOUTH_USER" | "EMPLOYER";

export function RoleTabs({ value, onChange }: { value: AuthRole; onChange: (role: AuthRole) => void }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-1 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-1">
      {(
        [
          { role: "YOUTH_USER" as const, label: "Youth" },
          { role: "EMPLOYER" as const, label: "Employer" },
        ]
      ).map((tab) => (
        <button
          key={tab.role}
          type="button"
          onClick={() => onChange(tab.role)}
          className={cn(
            "rounded-[calc(var(--sb-radius-sm)-2px)] py-1.5 text-sm font-medium transition-colors",
            value === tab.role
              ? "bg-[var(--sb-primary)] text-white"
              : "text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
