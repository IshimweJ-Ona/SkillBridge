"use client";

import { Archive, CheckCircle2, XCircle } from "@/lib/icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { admin, ApiError, integrations, type IntegrationStatus } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function AdminSettingsPage() {
  const { show } = useToast();
  const t = useTranslations();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    integrations.status().then(setStatus);
  }, []);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const result = await admin.archiveInactiveUsers();
      show({
        variant: "success",
        title: t("admin.settings.archiveSuccess"),
        description: t("admin.settings.archiveSuccessDescription", { count: result.count }),
      });
    } catch (err) {
      show({ variant: "error", title: t("admin.settings.archiveError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.settings.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("admin.settings.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.integrationStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!status ? (
            <p className="text-xs text-[var(--sb-text-muted)]">{t("common.loading")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <IntegrationRow label={t("admin.settings.emailLabel")} configured={status.resendConfigured} detail={status.emailProvider} t={t} />
              <IntegrationRow label={t("admin.settings.mediaLabel")} configured={status.cloudinaryConfigured} detail={status.mediaProvider} t={t} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.maintenance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[var(--sb-text-muted)]">
                <Archive size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--sb-text)]">{t("admin.settings.archiveTitle")}</p>
                <p className="text-xs text-[var(--sb-text-muted)]">{t("admin.settings.archiveDescription")}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" loading={archiving} onClick={handleArchive}>
              {t("admin.settings.runNow")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationRow({
  label,
  configured,
  detail,
  t,
}: {
  label: string;
  configured: boolean;
  detail: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] p-3">
      <div className="flex items-center gap-2">
        {configured ? (
          <CheckCircle2 size={14} className="text-[var(--sb-success)]" />
        ) : (
          <XCircle size={14} className="text-[var(--sb-text-faint)]" />
        )}
        <p className="text-xs font-medium text-[var(--sb-text)]">{label}</p>
      </div>
      <p className="mt-1 text-[10px] text-[var(--sb-text-faint)]">
        {configured ? t("admin.settings.configuredWithDetail", { detail }) : t("admin.settings.notConfigured")}
      </p>
    </div>
  );
}
