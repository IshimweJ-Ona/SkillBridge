"use client";

import { Building2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { Input, Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ApiError, companies, type Company } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function EmployerCompanyPage() {
  const { show } = useToast();
  const t = useTranslations();
  const [myCompanies, setMyCompanies] = useState<Company[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", sector: "", location: "", website: "", logoUrl: "" });

  useEffect(() => {
    companies.mine().then(setMyCompanies);
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await companies.create({
        name: form.name,
        description: form.description || undefined,
        sector: form.sector || undefined,
        location: form.location || undefined,
        website: form.website || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      setMyCompanies((current) => [created, ...(current ?? [])]);
      show({ variant: "success", title: t("employer.company.createSuccess"), description: t("employer.company.createSuccessDescription") });
    } catch (err) {
      show({
        variant: "error",
        title: t("employer.company.createError"),
        description: err instanceof ApiError ? err.message : t("common.tryAgain"),
      });
    } finally {
      setCreating(false);
    }
  };

  if (myCompanies === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("employer.company.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.company.subtitle")}</p>
      </div>

      {myCompanies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("employer.company.noCompanyTitle")}
          description={t("employer.company.noCompanyDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {myCompanies.map((company) => (
            <Card key={company.uuid} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--sb-text)]">{company.name}</p>
                  <p className="text-xs text-[var(--sb-text-muted)]">{company.sector ?? t("employer.company.sectorNotSet")}</p>
                </div>
                <StatusPill tone={company.status === "VERIFIED" ? "success" : "warning"}>
                  {company.status === "VERIFIED" ? t("employer.company.verified") : t("employer.company.pending")}
                </StatusPill>
              </div>
              {company.description && <p className="mt-2 text-xs text-[var(--sb-text-muted)]">{company.description}</p>}
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("employer.company.addTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label={t("employer.company.companyName")} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <Textarea
              label={t("employer.company.description")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("employer.company.sector")} value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
              <Input label={t("employer.company.location")} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <Input label={t("employer.company.website")} placeholder="https://" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
            <FileUpload
              label={t("employer.company.logo")}
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
              folder="skillbridge/company-logos"
              accept="image/*"
            />
            <Button type="submit" loading={creating}>
              {t("employer.dashboard.createCompany")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
