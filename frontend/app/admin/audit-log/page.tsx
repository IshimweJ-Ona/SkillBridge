"use client";

import { useEffect, useState } from "react";
import { UndrawEmpty } from "react-undraw-illustrations";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { admin, type AuditLogEntry } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

const ACTION_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  ROLE_CHANGE: "warning",
  STATUS_CHANGE: "info",
  LOGIN: "neutral",
  LOGOUT: "neutral",
  EXPORT: "warning",
  PAYMENT: "success",
  SYSTEM: "neutral",
};

export default function AdminAuditLogPage() {
  const t = useTranslations();
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    admin.auditLogs({ limit: 100 }).then(setLogs);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("analyst.auditLog.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("analyst.auditLog.subtitle")}</p>
      </div>

      <div className="space-y-2">
        {logs === null && Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}
        {logs !== null && logs.length === 0 && (
          <EmptyState illustration={UndrawEmpty} title={t("analyst.auditLog.noEntriesTitle")} description={t("analyst.auditLog.noEntriesDescription")} />
        )}
        {logs !== null &&
          logs.map((log) => (
            <Card key={log.uuid} className="flex items-center justify-between gap-3 p-3.5 text-xs">
              <div className="flex items-center gap-3">
                <StatusPill tone={ACTION_TONE[log.action] ?? "neutral"}>{log.action.replace("_", " ")}</StatusPill>
                <div>
                  <p className="font-medium text-[var(--sb-text)]">
                    {log.entityType}
                    {log.actor &&
                      ` · ${t("analyst.auditLog.byActor", { name: `${log.actor.firstName} ${log.actor.lastName}`, role: log.actor.role })}`}
                  </p>
                  <p className="text-[10px] text-[var(--sb-text-faint)]">
                    {formatDate(log.createdAt)}
                    {log.ipAddress && ` · ${log.ipAddress}`}
                  </p>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
