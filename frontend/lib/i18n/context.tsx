"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en, { type Dictionary } from "./dictionaries/en";
import fr from "./dictionaries/fr";

export type Locale = "en" | "fr";

const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };
const STORAGE_KEY = "skillbridge.locale";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Locale lives in React state (persisted to localStorage) rather than a URL
// segment, so switching languages is a context update - no page reload, no
// route change, no lost form state (SRS NFR 3.2).
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr") setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function resolvePath(dict: Dictionary, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider.");
  return context;
}

// t("auth.signIn.title") does a dot-path lookup; t("youthDashboard.greeting", { name: "Jonathan" })
// substitutes {name}-style placeholders. Falls back to the raw key (visibly
// wrong rather than silently blank) if a translation is missing.
export function useTranslations() {
  const { locale } = useLanguage();

  return useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = resolvePath(DICTIONARIES[locale], key);
      let text = typeof value === "string" ? value : key;
      if (vars) {
        for (const [varKey, varValue] of Object.entries(vars)) {
          text = text.replace(`{${varKey}}`, String(varValue));
        }
      }
      return text;
    },
    [locale],
  );
}
