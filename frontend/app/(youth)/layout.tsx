"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { YOUTH_NAV } from "@/lib/nav-config";

export default function YouthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={YOUTH_NAV} requiredRole="YOUTH_USER">
      {children}
    </DashboardShell>
  );
}
