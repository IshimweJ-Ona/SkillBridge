"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EMPLOYER_NAV } from "@/lib/nav-config";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={EMPLOYER_NAV} requiredRole="EMPLOYER">
      {children}
    </DashboardShell>
  );
}
