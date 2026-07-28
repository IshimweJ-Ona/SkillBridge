"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { roleHomePath } from "@/lib/nav-config";
import { useToast } from "@/components/ui/toast";

// Dedicated, unlisted staff sign-in - never linked from the public welcome
// page (Administrator/Analyst accounts are staff-created only, see
// auth.service.ts#signup). One form serves both roles: the login itself
// doesn't need to know which - roleHomePath() below sends the user to the
// right dashboard based on whatever role is actually stored on their
// account. Reachable only by whoever this URL is given to directly (nginx
// may add further access restriction on this specific path).
export default function StaffSignInPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { show } = useToast();
  const t = useTranslations();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await auth.login({ identifier, password });
      setSession(response.user);
      router.push(roleHomePath(response.user.role));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("auth.signIn.genericError"));
      }
      show({ variant: "error", title: t("auth.signIn.toastTitle"), description: t("auth.signIn.toastDescription") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sb-fade-in rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-6 shadow-[var(--sb-shadow-md)]">
      <h2 className="text-lg font-semibold">{t("auth.staffSignIn.title")}</h2>
      <p className="mt-1 text-sm text-[var(--sb-text-muted)]">{t("auth.staffSignIn.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Input
          label={t("auth.signIn.identifierLabel")}
          placeholder={t("auth.signIn.identifierPlaceholder")}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          required
        />
        <Input
          label={t("auth.signIn.passwordLabel")}
          type="password"
          placeholder={t("auth.signIn.passwordPlaceholder")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        {error && (
          <p role="alert" className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-danger)]/40 bg-[var(--sb-danger-soft)] px-3 py-2 text-xs text-[var(--sb-danger)]">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)]">
            {t("auth.signIn.forgotPassword")}
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t("auth.signIn.submit")}
        </Button>
      </form>
    </div>
  );
}
