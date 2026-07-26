"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RoleTabs, type AuthRole } from "@/components/auth/role-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, auth } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { validateEmail, validatePassword, validatePhone } from "@/lib/validation";

function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();

  const [role, setRole] = useState<AuthRole>(searchParams.get("role") === "employer" ? "EMPLOYER" : "YOUTH_USER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmployer = role === "EMPLOYER";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email && !phone) {
      setError(t("auth.signUp.errorEmailOrPhone"));
      return;
    }
    if (email) {
      const emailError = validateEmail(email);
      if (emailError) return setError(emailError);
    }
    if (isEmployer && !email) {
      setError(t("auth.signUp.errorEmployerEmail"));
      return;
    }
    if (phone) {
      const phoneError = validatePhone(phone);
      if (phoneError) return setError(phoneError);
    }
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError(t("auth.signUp.errorPasswordsMismatch"));
    if (!agreed) return setError(t("auth.signUp.errorTerms"));

    setLoading(true);
    try {
      const response = await auth.signup({
        email: email || undefined,
        phone: phone || undefined,
        password,
        firstName,
        lastName,
        role,
      });
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (phone) params.set("phone", phone);
      router.push(`/verify-otp?${params.toString()}`);
      // Demo-mode signup returns the OTP inline (no real email/SMS provider
      // is configured for local development) - surfaced to the user below.
      if (response.deliveryStatus === "skipped") {
        window.sessionStorage.setItem("sb.signupMessage", response.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.signUp.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sb-fade-in rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-6">
      <h2 className="text-lg font-semibold">{t("auth.signUp.title")}</h2>
      <p className="mt-1 text-sm text-[var(--sb-text-muted)]">{t("auth.signUp.subtitle")}</p>

      <div className="mt-5">
        <RoleTabs value={role} onChange={setRole} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("auth.signUp.firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label={t("auth.signUp.lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <Input
          label={isEmployer ? t("auth.signUp.emailLabel") : t("auth.signUp.emailLabelOptional")}
          type="email"
          placeholder={t("auth.signUp.emailLabel")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!isEmployer && (
          <Input
            label={t("auth.signUp.phoneLabel")}
            placeholder={t("auth.signUp.phoneLabel")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            hint={t("auth.signUp.phoneWhatsappHint")}
          />
        )}
        <Input
          label={t("auth.signUp.passwordLabel")}
          type="password"
          placeholder={t("auth.signUp.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t("auth.signUp.passwordHint")}
        />
        <Input
          label={t("auth.signUp.confirmPasswordLabel")}
          type="password"
          placeholder={t("auth.signUp.confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <label className="flex items-start gap-2 text-xs text-[var(--sb-text-muted)]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-[var(--sb-primary)]"
          />
          {t("auth.signUp.agreeTerms")}
        </label>
        {error && (
          <p role="alert" className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-danger)]/40 bg-[var(--sb-danger-soft)] px-3 py-2 text-xs text-[var(--sb-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t("auth.signUp.submit")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--sb-border)]" />
        <span className="text-[10px] uppercase tracking-wide text-[var(--sb-text-faint)]">{t("common.or")}</span>
        <div className="h-px flex-1 bg-[var(--sb-border)]" />
      </div>

      <OAuthButtons role={role} />

      <p className="mt-6 text-center text-xs text-[var(--sb-text-muted)]">
        {t("auth.signUp.haveAccount")}{" "}
        <Link href={`/sign-in?role=${role === "EMPLOYER" ? "employer" : "youth"}`} className="font-medium text-[var(--sb-primary)] hover:underline">
          {t("auth.signUp.login")}
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
