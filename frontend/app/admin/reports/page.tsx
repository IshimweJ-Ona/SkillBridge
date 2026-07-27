"use client";

import { useEffect, useState } from "react";
import { UndrawDocuments } from "react-undraw-illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { admin, users, ApiError, type ReportExport } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

export default function AdminReportsPage() {
  const { show } = useToast();
  const t = useTranslations();

  const REPORT_TYPES = [
    { type: "employment-outcomes", label: t("analyst.reports.employmentOutcomesLabel"), description: t("analyst.reports.employmentOutcomesDescription") },
    { type: "skill-demand", label: t("analyst.reports.skillDemandLabel"), description: t("analyst.reports.skillDemandDescription") },
    { type: "user-growth", label: t("analyst.reports.userGrowthLabel"), description: t("analyst.reports.userGrowthDescription") },
  ];
  const [reports, setReports] = useState<ReportExport[] | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = () => admin.listReports().then(setReports);

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    try {
      await admin.createReport({ type });
      show({ variant: "success", title: t("analyst.reports.generateSuccess") });
      await load();
    } catch (err) {
      show({ variant: "error", title: t("analyst.reports.generateError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      if (type === "employment-outcomes") {
        const outcomes = await admin.employmentOutcomes();
        downloadCsv(
          `skillbridge-employment-outcomes-${Date.now()}.csv`,
          ["Status", "Count"],
          [
            ["Submitted", outcomes.submitted],
            ["Under Review", outcomes.underReview],
            ["Shortlisted", outcomes.shortlisted],
            ["Hired", outcomes.hired],
            ["Rejected", outcomes.rejected],
            ["Placement Rate (%)", outcomes.placementRate],
          ],
        );
      } else if (type === "skill-demand") {
        const skills = await admin.skillDemand({});
        downloadCsv(
          `skillbridge-skill-demand-${Date.now()}.csv`,
          ["Skill", "Open Job Postings"],
          skills.map((entry) => [entry.skill, entry.count]),
        );
      } else {
        const [userStats, summary] = await Promise.all([users.summary(), admin.summary()]);
        downloadCsv(
          `skillbridge-user-growth-${Date.now()}.csv`,
          ["Metric", "Value"],
          [
            ["Total Users", userStats.total],
            ["Active Users", userStats.active],
            ["Pending Users", userStats.pending],
            ["Suspended Users", userStats.suspended],
            ["Active Rate (%)", summary.activeRate],
            ...userStats.byRole.map((entry): [string, number] => [`Role: ${entry.role}`, entry.count]),
          ],
        );
      }
    } catch (err) {
      show({ variant: "error", title: t("analyst.reports.exportError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("analyst.reports.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("analyst.reports.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {REPORT_TYPES.map((report) => (
          <Card key={report.type} className="p-4">
            <p className="text-sm font-semibold text-[var(--sb-text)]">{report.label}</p>
            <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{report.description}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" loading={generating === report.type} onClick={() => handleGenerate(report.type)}>
                {t("analyst.reports.generate")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                loading={exporting === report.type}
                onClick={() => handleExport(report.type)}
              >
                {t("analyst.reports.exportCsv")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analyst.reports.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {reports === null && <p className="text-xs text-[var(--sb-text-muted)]">{t("common.loading")}</p>}
          {reports !== null && reports.length === 0 && (
            <EmptyState illustration={UndrawDocuments} title={t("analyst.reports.noReportsTitle")} description={t("analyst.reports.noReportsDescription")} />
          )}
          {reports !== null && reports.length > 0 && (
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.uuid} className="flex items-center justify-between rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] px-3 py-2.5 text-xs">
                  <div>
                    <p className="font-medium text-[var(--sb-text)]">{report.type.replace(/-/g, " ")}</p>
                    <p className="text-[var(--sb-text-faint)]">
                      {formatDate(report.createdAt)}
                      {report.requestedBy && ` · ${report.requestedBy.firstName} ${report.requestedBy.lastName}`}
                    </p>
                  </div>
                  <StatusPill tone={report.status === "COMPLETED" ? "success" : report.status === "FAILED" ? "danger" : "warning"}>
                    {report.status}
                  </StatusPill>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
