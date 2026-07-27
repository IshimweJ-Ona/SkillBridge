"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RoleTabs, type AuthRole } from "@/components/auth/role-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  auth,
  DEMO_ADMIN_CREDENTIALS,
  DEMO_ANALYST_CREDENTIALS,
  DEMO_CREDENTIALS,
  DEMO_EMPLOYER_CREDENTIALS,
  USE_MOCK_API,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { roleHomePath } from "@/lib/nav-config";
import { useToast } from "@/components/ui/toast";

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const { show } = useToast();
  const t = useTranslations();

  const [role, setRole] = useState<AuthRole>(searchParams.get("role") === "employer" ? "EMPLOYER" : "YOUTH_USER");
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
      <h2 className="text-lg font-semibold">{t("auth.signIn.title")}</h2>
      <p className="mt-1 text-sm text-[var(--sb-text-muted)]">{t("auth.signIn.subtitle")}</p>

      <div className="mt-5">
        <RoleTabs value={role} onChange={setRole} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

      {USE_MOCK_API && (
        <div className="mt-4 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3 text-[11px] text-[var(--sb-text-faint)]">
          <p className="font-medium text-[var(--sb-text-muted)]">{t("auth.signIn.demoTitle")}</p>
          <p className="mt-1">{t("welcome.youthLabel")}: {DEMO_CREDENTIALS.identifier} / {DEMO_CREDENTIALS.password}</p>
          <p>{t("welcome.employerLabel")}: {DEMO_EMPLOYER_CREDENTIALS.identifier} / {DEMO_EMPLOYER_CREDENTIALS.password}</p>
          <p>{t("welcome.analystLabel")}: {DEMO_ANALYST_CREDENTIALS.identifier} / {DEMO_ANALYST_CREDENTIALS.password}</p>
          <p>{t("welcome.adminLabel")}: {DEMO_ADMIN_CREDENTIALS.identifier} / {DEMO_ADMIN_CREDENTIALS.password}</p>
        </div>
      )}

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--sb-border)]" />
        <span className="text-[10px] uppercase tracking-wide text-[var(--sb-text-faint)]">{t("common.or")}</span>
        <div className="h-px flex-1 bg-[var(--sb-border)]" />
      </div>

      <OAuthButtons />

      <p className="mt-6 text-center text-xs text-[var(--sb-text-muted)]">
        {t("auth.signIn.noAccount")}{" "}
        <Link href={`/sign-up?role=${role === "EMPLOYER" ? "employer" : "youth"}`} className="font-medium text-[var(--sb-primary)] hover:underline">
          {t("auth.signIn.signUp")}
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
