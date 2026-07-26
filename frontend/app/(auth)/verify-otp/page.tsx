"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { roleHomePath } from "@/lib/nav-config";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const t = useTranslations();

  const email = searchParams.get("email") ?? undefined;
  const phone = searchParams.get("phone") ?? undefined;
  const contact = email ?? phone ?? "your contact";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const message = window.sessionStorage.getItem("sb.signupMessage");
    if (message) {
      setNotice(message);
      window.sessionStorage.removeItem("sb.signupMessage");
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError(t("auth.otp.errorIncomplete"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await auth.verifyOtp({ email, phone, code });
      setSession(response.user);
      router.push(roleHomePath(response.user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.otp.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const response = await auth.resendOtp({ email, phone });
      setNotice(response.message);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.otp.resendError"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="sb-fade-in rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-6 text-center">
      <h2 className="text-lg font-semibold">{t("auth.otp.title")}</h2>
      <p className="mt-1 text-sm text-[var(--sb-text-muted)]">
        {t("auth.otp.subtitle")}
        <br />
        <span className="text-[var(--sb-text)]">{contact}</span>
      </p>

      {notice && (
        <p className="mt-4 rounded-[var(--sb-radius-sm)] border border-[var(--sb-info)]/40 bg-[var(--sb-info-soft)] px-3 py-2 text-xs text-[var(--sb-info)]">
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="flex justify-center gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              value={digit}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-10 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] text-center text-lg font-semibold text-[var(--sb-text)] focus:border-[var(--sb-primary)] focus:outline-none"
            />
          ))}
        </div>

        {cooldown > 0 ? (
          <p className="mt-4 text-xs text-[var(--sb-text-faint)]">
            {t("auth.otp.resendIn")} 00:{cooldown.toString().padStart(2, "0")}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-4 text-xs font-medium text-[var(--sb-primary)] hover:underline disabled:opacity-50"
          >
            {resending ? t("auth.otp.resending") : t("auth.otp.resend")}
          </button>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-[var(--sb-radius-sm)] border border-[var(--sb-danger)]/40 bg-[var(--sb-danger-soft)] px-3 py-2 text-xs text-[var(--sb-danger)]">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-5 w-full" size="lg" loading={loading}>
          {t("auth.otp.submit")}
        </Button>
      </form>

      <p className="mt-4 text-xs text-[var(--sb-text-faint)]">{t("auth.otp.helpText")}</p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
