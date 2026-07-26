"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

// Next.js route-segment error boundary: a render/runtime crash anywhere
// under this segment lands here instead of a blank page, and is scoped to
// this one visitor's browser tab only - it never touches other users or
// other backend services.
export default function ErrorBoundaryPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--sb-bg)] px-4 text-center text-[var(--sb-text)]">
      <Logo />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]">
        <AlertTriangle size={26} />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sb-text-muted)]">
          This page ran into an unexpected error. Your account and data are unaffected - try again,
          or head back to your dashboard.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => reset()}>
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/welcome")}>Go to home</Button>
      </div>
    </div>
  );
}
