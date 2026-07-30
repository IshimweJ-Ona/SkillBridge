"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, auth } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await auth.requestPasswordReset({ identifier });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.forgotPassword.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sb-fade-in rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-6 shadow-[var(--sb-shadow-md)]">
      <h2 className="text-lg font-semibold">{t("auth.forgotPassword.title")}</h2>
      <p className="mt-1 text-sm text-[var(--sb-text-muted)]">{t("auth.forgotPassword.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Input
          label={t("auth.forgotPassword.identifierLabel")}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t("auth.forgotPassword.identifierPlaceholder")}
          required
        />
        {message && (
          <p className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-success)]/40 bg-[var(--sb-success-soft)] px-3 py-2 text-xs text-[var(--sb-success)]">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-danger)]/40 bg-[var(--sb-danger-soft)] px-3 py-2 text-xs text-[var(--sb-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t("auth.forgotPassword.submit")}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-xs">
        <Link href="/reset-password" className="text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)]">
          {t("auth.forgotPassword.haveToken")}
        </Link>
        <Link href="/sign-in" className="text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)]">
          {t("auth.forgotPassword.backToSignIn")}
        </Link>
      </div>
    </div>
  );
}
