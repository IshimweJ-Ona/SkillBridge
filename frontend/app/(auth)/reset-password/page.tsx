"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { roleHomePath } from "@/lib/nav-config";
import { validatePassword } from "@/lib/validation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const t = useTranslations();

  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError(t("auth.signUp.errorPasswordsMismatch"));

    setLoading(true);
    try {
      const response = await auth.resetPassword({ token, password });
      setSession(response.user);
      router.push(roleHomePath(response.user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.resetPassword.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sb-fade-in rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-6">
      <h2 className="text-lg font-semibold">{t("auth.resetPassword.title")}</h2>
      <p className="mt-1 text-sm text-[var(--sb-text-muted)]">{t("auth.resetPassword.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Input label={t("auth.resetPassword.tokenLabel")} value={token} onChange={(e) => setToken(e.target.value)} required />
        <Input
          label={t("auth.resetPassword.newPasswordLabel")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t("auth.signUp.passwordHint")}
          required
        />
        <Input
          label={t("auth.resetPassword.confirmPasswordLabel")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-danger)]/40 bg-[var(--sb-danger-soft)] px-3 py-2 text-xs text-[var(--sb-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t("auth.resetPassword.submit")}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
