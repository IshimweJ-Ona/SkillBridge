"use client";

import { Loader2 } from "@/lib/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { roleHomePath } from "@/lib/nav-config";

function errorKey(error: string) {
  if (error === "oauth_denied") return "errorDenied";
  if (error === "oauth_not_configured") return "errorNotConfigured";
  return "errorFailed";
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status } = useAuth();
  const t = useTranslations();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(roleHomePath(user.role));
    }
  }, [status, user, router]);

  if (error || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-[var(--sb-text)]">{t("oauth.errorTitle")}</p>
        <p className="text-xs text-[var(--sb-text-muted)]">{t(`oauth.${errorKey(error ?? "")}`)}</p>
        <button
          type="button"
          onClick={() => router.push("/sign-in")}
          className="text-xs font-medium text-[var(--sb-primary)] hover:underline"
        >
          {t("oauth.backToSignIn")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      <p className="text-xs text-[var(--sb-text-muted)]">{t("oauth.signingIn")}</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackContent />
    </Suspense>
  );
}
