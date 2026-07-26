"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/lib/nav-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={ADMIN_NAV} requiredRole="ADMINISTRATOR">
      {children}
    </DashboardShell>
  );
}
