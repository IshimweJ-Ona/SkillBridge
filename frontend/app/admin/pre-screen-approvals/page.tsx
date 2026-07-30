"use client";

import { ExternalLink } from "@/lib/icons";
import { useEffect, useState } from "react";
import { UndrawEmpty } from "react-undraw-illustrations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, jobs, type JobPosting } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function PreScreenApprovalsPage() {
  const { show } = useToast();
  const t = useTranslations();
  const [items, setItems] = useState<JobPosting[] | null>(null);
  const [autoProctorUrls, setAutoProctorUrls] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);

  const load = () => jobs.listPendingPreScreen().then(setItems);

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (job: JobPosting) => {
    const autoProctorUrl = autoProctorUrls[job.uuid]?.trim();
    if (!autoProctorUrl) {
      show({ variant: "error", title: t("admin.preScreen.urlRequired") });
      return;
    }

    setApproving(job.uuid);
    try {
      await jobs.approvePreScreen(job.uuid, autoProctorUrl);
      setItems((current) => current?.filter((item) => item.uuid !== job.uuid) ?? null);
      show({
        variant: "success",
        title: t("admin.preScreen.approveSuccess", { title: job.title }),
        description: t("admin.preScreen.approveSuccessDescription"),
      });
    } catch (err) {
      show({ variant: "error", title: t("admin.preScreen.approveError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.preScreen.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("admin.preScreen.subtitle")}</p>
      </div>

      <div className="space-y-3">
        {items === null && Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}
        {items !== null && items.length === 0 && (
          <EmptyState illustration={UndrawEmpty} title={t("admin.preScreen.noPendingTitle")} description={t("admin.preScreen.noPendingDescription")} />
        )}
        {items !== null &&
          items.map((job) => {
            const pendingUrl = job.preScreenChallenge?.resources?.find((r) => r.type === "pending_autoproctor")?.url;
            const responseSheetUrl = job.preScreenChallenge?.resources?.find((r) => r.type === "response_sheet")?.url;
            return (
              <Card key={job.uuid} className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--sb-text)]">{job.title}</p>
                  <p className="text-xs text-[var(--sb-text-muted)]">{job.company.name}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {pendingUrl && (
                    <a
                      href={pendingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[var(--sb-primary)] hover:underline"
                    >
                      {t("admin.preScreen.viewSubmittedForm")} <ExternalLink size={12} />
                    </a>
                  )}
                  {responseSheetUrl && (
                    <a
                      href={responseSheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[var(--sb-primary)] hover:underline"
                    >
                      {t("admin.preScreen.viewResponseSheet")} <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder={t("admin.preScreen.autoProctorUrlPlaceholder")}
                    value={autoProctorUrls[job.uuid] ?? ""}
                    onChange={(event) => setAutoProctorUrls((current) => ({ ...current, [job.uuid]: event.target.value }))}
                    className="flex-1"
                  />
                  <Button size="sm" loading={approving === job.uuid} onClick={() => handleApprove(job)}>
                    {t("admin.preScreen.approveAndPublish")}
                  </Button>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
