"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage, type Locale } from "@/lib/i18n/context";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale } = useLanguage();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 items-center gap-1.5 rounded-[var(--sb-radius-sm)] px-2.5 text-xs font-medium text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={15} />
        {locale.toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="sb-fade-in absolute right-0 z-20 mt-1.5 w-32 overflow-hidden rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] py-1 shadow-xl shadow-black/40"
          >
            {LANGUAGES.map((language) => (
              <li key={language.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === language.code}
                  onClick={() => {
                    setLocale(language.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-[var(--sb-bg-panel-hover)]",
                    locale === language.code ? "text-[var(--sb-primary)]" : "text-[var(--sb-text-muted)]",
                  )}
                >
                  {language.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
