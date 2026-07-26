"use client";

import { Building2, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, companies, type Company } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function AdminCompaniesPage() {
  const { show } = useToast();
  const t = useTranslations();
  const [items, setItems] = useState<Company[] | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = () => companies.pendingVerification().then((result) => setItems(result.items));

  useEffect(() => {
    load();
  }, []);

  const handleVerify = async (company: Company) => {
    setVerifying(company.uuid);
    try {
      await companies.verify(company.uuid);
      setItems((current) => current?.filter((item) => item.uuid !== company.uuid) ?? null);
      show({
        variant: "success",
        title: t("admin.companies.verifySuccess", { name: company.name }),
        description: t("admin.companies.verifySuccessDescription"),
      });
    } catch (err) {
      show({ variant: "error", title: t("admin.companies.verifyError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.companies.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("admin.companies.subtitle")}</p>
      </div>

      <div className="space-y-3">
        {items === null && Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
        {items !== null && items.length === 0 && (
          <EmptyState icon={CheckCircle2} title={t("admin.companies.noPendingTitle")} description={t("admin.companies.noPendingDescription")} />
        )}
        {items !== null &&
          items.map((company) => (
            <Card key={company.uuid} className="flex items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-white/5 text-[var(--sb-text-muted)]">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--sb-text)]">{company.name}</p>
                  <p className="text-xs text-[var(--sb-text-muted)]">
                    {company.sector ?? t("employer.company.sectorNotSet")} · {company.location ?? t("admin.companies.locationNotSet")}
                  </p>
                  {company.description && <p className="mt-1 max-w-lg text-xs text-[var(--sb-text-muted)]">{company.description}</p>}
                </div>
              </div>
              <Button size="sm" loading={verifying === company.uuid} onClick={() => handleVerify(company)}>
                {t("admin.companies.verify")}
              </Button>
            </Card>
          ))}
      </div>
    </div>
  );
}
