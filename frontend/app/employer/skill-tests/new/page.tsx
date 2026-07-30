"use client";

import { Building2, Loader2 } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { useToast } from "@/components/ui/toast";
import { MCQQuestionEditor, newMCQQuestion, type MCQQuestionDraft } from "@/components/challenges/mcq-question-editor";
import { ApiError, challenges, companies, type Company } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function NewSkillTestPage() {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();

  const [myCompanies, setMyCompanies] = useState<Company[] | null>(null);
  const [companyUuid, setCompanyUuid] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [passingScore, setPassingScore] = useState("70");
  const [questions, setQuestions] = useState<MCQQuestionDraft[]>([newMCQQuestion()]);
  const [submitting, setSubmitting] = useState(false);

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
      await challenges.create(companyUuid, {
        title,
        description,
        sector: skillCategory,
        skillCategory,
        durationMinutes: Number(durationMinutes) || 30,
        passingScore: Number(passingScore) || 70,
        status: "PUBLISHED",
        questions: questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          options: question.options,
          answer: String(question.correctIndex),
          points: 1,
        })),
      });
      show({
        variant: "success",
        title: t("employer.skillTests.postSuccessTitle"),
        description: t("employer.skillTests.postSuccessDescription"),
      });
      router.push("/employer/skill-tests");
    } catch (err) {
      show({
        variant: "error",
        title: t("employer.skillTests.postErrorTitle"),
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

  const canSubmit = questions.every((question) => question.prompt.trim() && question.options.every((option) => option.trim()));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("employer.skillTests.newTestTitle")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("employer.skillTests.newTestSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("employer.skillTests.testDetails")}</CardTitle>
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
              label={t("employer.skillTests.testTitle")}
              placeholder={t("employer.skillTests.testTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label={t("employer.skillTests.testDescription")}
              placeholder={t("employer.skillTests.testDescriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
              required
            />
            <Input
              label={t("employer.skillTests.skillCategory")}
              placeholder={t("employer.skillTests.skillCategoryPlaceholder")}
              value={skillCategory}
              onChange={(e) => setSkillCategory(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("employer.skillTests.durationLabel")}
                type="number"
                min={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
              <Input
                label={t("employer.skillTests.passingScoreLabel")}
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--sb-text)]">{t("employer.skillTests.questionsHeading")}</p>
              <MCQQuestionEditor questions={questions} onChange={setQuestions} />
            </div>

            <Button type="submit" loading={submitting} disabled={!canSubmit}>
              {t("employer.skillTests.publishTest")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
