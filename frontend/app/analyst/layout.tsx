"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ANALYST_NAV } from "@/lib/nav-config";

export default function AnalystLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={ANALYST_NAV} requiredRole="ANALYST">
      {children}
    </DashboardShell>
  );
}
