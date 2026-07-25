"use client";

import { Award, Briefcase, Building2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { admin, users, type AdminSummary, type UsersSummary } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function AdminDashboardPage() {
  const t = useTranslations();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [userStats, setUserStats] = useState<UsersSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([admin.summary(), users.summary()]).then(([summaryResult, userResult]) => {
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      if (userResult.status === "fulfilled") setUserStats(userResult.value);
      setLoading(false);
    });
  }, []);

  const maxRoleCount = Math.max(1, ...(userStats?.byRole.map((r) => r.count) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.dashboard.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("admin.dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Users} label={t("admin.dashboard.totalUsers")} value={loading ? null : summary?.totalUsers} />
        <StatTile icon={Building2} label={t("admin.dashboard.pendingCompanies")} value={loading ? null : summary?.pendingCompanies} />
        <StatTile icon={Briefcase} label={t("admin.dashboard.openJobs")} value={loading ? null : summary?.openJobs} />
        <StatTile icon={Award} label={t("admin.dashboard.placements")} value={loading ? null : summary?.placements} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("admin.dashboard.usersByRole")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <Skeleton className="h-32 w-full" />}
            {!loading &&
              userStats?.byRole.map((entry) => (
                <div key={entry.role}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--sb-text-muted)]">{entry.role.replace("_", " ")}</span>
                    <span className="text-[var(--sb-text)]">{entry.count}</span>
                  </div>
                  <ProgressBar value={(entry.count / maxRoleCount) * 100} className="mt-1" />
                </div>
              ))}
            {!loading && userStats && (
              <div className="flex gap-4 pt-2 text-xs text-[var(--sb-text-faint)]">
                <span>{t("admin.dashboard.active")}: {userStats.active}</span>
                <span>{t("admin.dashboard.pending")}: {userStats.pending}</span>
                <span>{t("admin.dashboard.suspended")}: {userStats.suspended}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <LinkButton href="/admin/companies" className="w-full" size="sm">
              {t("admin.dashboard.reviewPendingCompanies")}
            </LinkButton>
            <LinkButton href="/admin/users" variant="secondary" className="w-full" size="sm">
              {t("admin.dashboard.manageUsers")}
            </LinkButton>
            <LinkButton href="/admin/audit-log" variant="secondary" className="w-full" size="sm">
              {t("admin.dashboard.viewAuditLog")}
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | null | undefined;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[var(--sb-text-faint)]">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--sb-text)]">
        {value === null || value === undefined ? <Skeleton className="h-7 w-10" /> : value}
      </p>
    </Card>
  );
}
