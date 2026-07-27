"use client";

import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/components/ui/toast";
import { ApiError, challenges, companies, jobs, type Company } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function NewJobPage() {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();
  const [myCompanies, setMyCompanies] = useState<Company[] | null>(null);
  const [companyUuid, setCompanyUuid] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [compensationRange, setCompensationRange] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [hasPreScreen, setHasPreScreen] = useState(false);
  const [preScreenSkillCategory, setPreScreenSkillCategory] = useState("");
  const [preScreenFormUrl, setPreScreenFormUrl] = useState("");
  const [preScreenDuration, setPreScreenDuration] = useState("30");
  const [preScreenPassingScore, setPreScreenPassingScore] = useState("70");

  useEffect(() => {
    companies.mine().then((result) => {
      setMyCompanies(result);
      const verified = result.find((company) => company.status === "VERIFIED");
      if (verified) setCompanyUuid(verified.uuid);
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      let preScreenChallengeUuid: string | undefined;
      if (hasPreScreen) {
        const challenge = await challenges.create(companyUuid, {
          title: `${title || t("employer.jobs.jobTitle")} - ${t("employer.jobs.preScreenTitle")}`,
          description: t("employer.jobs.preScreenChallengeDescription"),
          sector: "Professional Skills",
          skillCategory: preScreenSkillCategory || title,
          durationMinutes: Number(preScreenDuration) || 30,
          passingScore: Number(preScreenPassingScore) || 70,
          status: "PUBLISHED",
          resources: [
            {
              type: "external_test",
              label: t("employer.jobs.preScreenOpenTest"),
              url: preScreenFormUrl,
            },
          ],
        });
        preScreenChallengeUuid = challenge.uuid;
      }

      await jobs.createJob(companyUuid, {
        title,
        description,
        requiredSkills,
        compensationRange: compensationRange || undefined,
        location: location || undefined,
        preScreenChallengeUuid,
      });
      show({ variant: "success", title: t("employer.jobs.postSuccess"), description: t("employer.jobs.postSuccessDescription") });
      router.push("/employer/jobs");
    } catch (err) {
      show({
        variant: "error",
        title: t("employer.jobs.postError"),
        description: err instanceof ApiError ? err.message : t("common.tryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (myCompanies === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  const verifiedCompanies = myCompanies.filter((company) => company.status === "VERIFIED");

  if (verifiedCompanies.length === 0) {
    return (
      <Card className="mx-auto max-w-lg p-8">
        <EmptyState
          icon={Building2}
          title={t("employer.jobs.verifiedCompanyRequiredTitle")}
          description={
            myCompanies.length === 0
              ? t("employer.jobs.verifiedCompanyRequiredNoCompany")
              : t("employer.jobs.verifiedCompanyRequiredPending")
          }
          action={
            myCompanies.length === 0 ? (
              <LinkButton href="/employer/company" size="sm">
                {t("employer.dashboard.createCompany")}
              </LinkButton>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("employer.jobs.newJobTitle")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.jobs.newJobSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("employer.jobs.jobDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {verifiedCompanies.length > 1 && (
              <div>
                <label className="text-xs font-medium text-[var(--sb-text-muted)]">{t("employer.jobs.companyLabel")}</label>
                <select
                  value={companyUuid}
                  onChange={(event) => setCompanyUuid(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-sm text-[var(--sb-text)] focus:border-[var(--sb-primary)] focus:outline-none"
                >
                  {verifiedCompanies.map((company) => (
                    <option key={company.uuid} value={company.uuid}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Input
              label={t("employer.jobs.jobTitle")}
              placeholder={t("employer.jobs.jobTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label={t("employer.jobs.jobDescription")}
              placeholder={t("employer.jobs.jobDescriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32"
              required
            />
            <TagInput
              label={t("employer.jobs.requiredSkills")}
              values={requiredSkills}
              onChange={setRequiredSkills}
              placeholder={t("employer.jobs.requiredSkillsPlaceholder")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("employer.jobs.compensationRange")}
                placeholder={t("employer.jobs.compensationRangePlaceholder")}
                value={compensationRange}
                onChange={(e) => setCompensationRange(e.target.value)}
              />
              <Input
                label={t("employer.jobs.locationLabel")}
                placeholder={t("employer.jobs.locationPlaceholder")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--sb-text)]">
                <input
                  type="checkbox"
                  checked={hasPreScreen}
                  onChange={(e) => setHasPreScreen(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--sb-border)]"
                />
                {t("employer.jobs.preScreenToggle")}
              </label>
              <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("employer.jobs.preScreenHint")}</p>

              {hasPreScreen && (
                <div className="mt-4 space-y-3">
                  <Input
                    label={t("employer.jobs.preScreenSkillLabel")}
                    placeholder={t("employer.jobs.preScreenSkillPlaceholder")}
                    value={preScreenSkillCategory}
                    onChange={(e) => setPreScreenSkillCategory(e.target.value)}
                  />
                  <Input
                    label={t("employer.jobs.preScreenFormUrlLabel")}
                    placeholder="https://forms.gle/..."
                    value={preScreenFormUrl}
                    onChange={(e) => setPreScreenFormUrl(e.target.value)}
                    required={hasPreScreen}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      label={t("employer.jobs.preScreenDurationLabel")}
                      value={preScreenDuration}
                      onChange={(e) => setPreScreenDuration(e.target.value)}
                    />
                    <Input
                      type="number"
                      label={t("employer.jobs.preScreenPassingScoreLabel")}
                      value={preScreenPassingScore}
                      onChange={(e) => setPreScreenPassingScore(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" loading={submitting}>
              {t("employer.jobs.postJob")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
