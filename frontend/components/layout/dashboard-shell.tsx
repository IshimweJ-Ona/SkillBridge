"use client";

import { Loader2 } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { roleHomePath, type NavItem } from "@/lib/nav-config";
import type { Role } from "@/lib/api";
import { OnboardingOverlay } from "../onboarding/onboarding-overlay";
import { OnboardingProvider } from "../onboarding/onboarding-context";
import { ErrorBoundary } from "./error-boundary";
import { HelpButton } from "./help-button";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

export function DashboardShell({
  items,
  requiredRole,
  children,
}: {
  items: NavItem[];
  requiredRole: Role;
  children: React.ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/sign-in");
    } else if (status === "authenticated" && user && user.role !== requiredRole) {
      router.replace(roleHomePath(user.role));
    }
  }, [status, user, requiredRole, router]);

  if (status !== "authenticated" || !user || user.role !== requiredRole) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  return (
    <OnboardingProvider>
      <div className="flex min-h-screen flex-1">
        <Sidebar items={items} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col lg:pl-0">
          <TopNav onMenuClick={() => setMobileOpen(true)} />
          {/* Extra bottom padding (pb-24) keeps the last on-page control -
              e.g. a TagInput's "+" button - scrollable clear of the fixed
              Help button, which otherwise permanently sits on top of it at
              the bottom of the scroll range on short/mobile viewports. */}
          <main className="sb-fade-in flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
            <div className="mx-auto w-full max-w-[1400px]">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>
        <HelpButton />
        <OnboardingOverlay />
      </div>
    </OnboardingProvider>
  );
}
