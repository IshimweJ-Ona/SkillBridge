import { API_BASES, USE_MOCK_API } from "@/lib/api";

// Google OAuth 2.0 (FR 1.4): the backend implements a manual flow (GET
// /auth/google -> Google consent -> GET /auth/google/callback -> redirect to
// /oauth-callback with the session cookie already set). This button just
// navigates there directly - a real top-level page load, not a fetch, since
// the browser needs to follow Google's redirect chain itself.
//
// This cannot be exercised end-to-end in this environment: it requires real
// GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI values from a
// Google Cloud OAuth client, which are not configured here. In mock-API mode
// there is no backend at all to redirect to, so the button stays disabled.
export function OAuthButtons({ role }: { role?: "YOUTH_USER" | "EMPLOYER" }) {
  const googleHref = `${API_BASES.identity}/auth/google${role ? `?role=${role}` : ""}`;

  return (
    <div className="grid grid-cols-2 gap-2">
      {USE_MOCK_API ? (
        <button
          type="button"
          disabled
          title="Not available in demo mode"
          className="flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] text-xs font-medium text-[var(--sb-text-faint)]"
        >
          <GoogleIcon /> Google
        </button>
      ) : (
        <a
          href={googleHref}
          className="flex h-10 items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] text-xs font-medium text-[var(--sb-text-muted)] transition-colors hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
        >
          <GoogleIcon /> Google
        </a>
      )}
      <button
        type="button"
        disabled
        title="Coming soon"
        className="flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] text-xs font-medium text-[var(--sb-text-faint)]"
      >
        <AppleIcon /> Apple
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.4-1.6 4.1-5.27 4.1-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.85 3.7 14.72 2.7 12.18 2.7 6.98 2.7 2.77 6.9 2.77 12s4.21 9.3 9.41 9.3c5.43 0 9.03-3.81 9.03-9.17 0-.62-.07-1.09-.16-1.03z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.36 1.43c0 1.14-.42 2.2-1.24 3.06-.85.9-2.05 1.6-3.15 1.5-.15-1.1.43-2.28 1.24-3.03.86-.83 2.24-1.47 3.15-1.53zm3.36 16.02c-.4.94-.88 1.85-1.55 2.68-.91 1.14-1.86 2.28-3.29 2.3-1.4.03-1.85-.83-3.45-.83-1.6 0-2.1.8-3.42.86-1.38.06-2.44-1.24-3.36-2.37-1.84-2.28-3.24-6.43-1.35-9.24 1-1.4 2.53-2.28 4.18-2.3 1.35-.03 2.62.9 3.45.9.82 0 2.37-1.12 3.99-.95.68.03 2.6.28 3.83 2.05-.1.06-2.29 1.34-2.27 4.01.03 3.19 2.79 4.25 2.24 3.89z" />
    </svg>
  );
}
