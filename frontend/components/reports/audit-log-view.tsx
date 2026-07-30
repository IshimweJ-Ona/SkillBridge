"use client";

import {
  CreditCard,
  Edit,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash,
  type LucideIcon,
  FileText,
} from "@/lib/icons";
import { useEffect, useState } from "react";
import { UndrawEmpty } from "react-undraw-illustrations";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { admin, type AuditAction, type AuditLogEntry } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { cn, formatDate } from "@/lib/utils";

const ACTION_ICON: Record<AuditAction, LucideIcon> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash,
  ROLE_CHANGE: ShieldCheck,
  STATUS_CHANGE: RefreshCw,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  EXPORT: FileText,
  PAYMENT: CreditCard,
  SYSTEM: Settings,
};

const ACTION_TONE_CLASSES: Record<AuditAction, string> = {
  CREATE: "bg-[var(--sb-success-soft)] text-[var(--sb-success)]",
  UPDATE: "bg-[var(--sb-info-soft)] text-[var(--sb-info)]",
  DELETE: "bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]",
  ROLE_CHANGE: "bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]",
  STATUS_CHANGE: "bg-[var(--sb-info-soft)] text-[var(--sb-info)]",
  LOGIN: "bg-[var(--sb-bg-inset)] text-[var(--sb-text-muted)]",
  LOGOUT: "bg-[var(--sb-bg-inset)] text-[var(--sb-text-muted)]",
  EXPORT: "bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]",
  PAYMENT: "bg-[var(--sb-success-soft)] text-[var(--sb-success)]",
  SYSTEM: "bg-[var(--sb-bg-inset)] text-[var(--sb-text-muted)]",
};

export function AuditLogView() {
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
          logs.map((log) => {
            const Icon = ACTION_ICON[log.action];
            return (
              <Card key={log.uuid} className="flex items-center gap-3 p-3.5">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", ACTION_TONE_CLASSES[log.action])}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--sb-text)]">
                    <span className="text-[var(--sb-text-muted)]">{log.action.replace("_", " ")}</span> · {log.entityType}
                    {log.actor &&
                      ` · ${t("analyst.auditLog.byActor", { name: `${log.actor.firstName} ${log.actor.lastName}`, role: log.actor.role })}`}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--sb-text-faint)]">
                    {formatDate(log.createdAt)}
                    {log.ipAddress && ` · ${log.ipAddress}`}
                  </p>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
