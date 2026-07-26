"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

export function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  };

  return (
    <div>
      <label className="text-xs font-medium text-[var(--sb-text-muted)]">{label}</label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1 rounded-full bg-[var(--sb-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--sb-primary)]"
          >
            {value}
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder ?? "Add and press Enter"}
          className="h-9 flex-1 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-sm text-[var(--sb-text)] placeholder:text-[var(--sb-text-faint)] focus:border-[var(--sb-primary)] focus:outline-none"
        />
        <button
          type="button"
          onClick={addTag}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)]"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
