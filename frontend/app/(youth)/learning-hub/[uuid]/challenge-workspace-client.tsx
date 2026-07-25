"use client";

import { Award, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError, challenges, type ChallengeSubmission, type SkillChallenge } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { useAutosave } from "@/lib/use-autosave";

export function ChallengeWorkspaceClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();

  const [challenge, setChallenge] = useState<SkillChallenge | null>(null);
  const [submission, setSubmission] = useState<ChallengeSubmission | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    challenges
      .get(uuid)
      .then((result) => {
        if (active) setChallenge(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uuid]);

  const { status: autosaveStatus, saveNow } = useAutosave(
    response,
    async (value) => {
      if (submission && submission.status === "IN_PROGRESS") {
        await challenges.autosave(submission.uuid, { responseText: value });
      }
    },
    60000,
  );

  const handleStart = async () => {
    try {
      const created = await challenges.start(uuid);
      setSubmission(created);
    } catch (err) {
      show({ variant: "error", title: t("learningHub.startError"), description: err instanceof ApiError ? err.message : undefined });
    }
  };

  const handleSubmit = async () => {
    if (!submission) return;
    setSubmitting(true);
    try {
      const graded = await challenges.submit(submission.uuid, { responseText: response });
      setSubmission(graded);
      const passed = challenge && (graded.score ?? 0) >= challenge.passingScore;
      show({
        variant: passed ? "success" : "info",
        title: passed ? t("learningHub.passedTitle") : t("learningHub.submittedTitle"),
        description: passed ? t("learningHub.passedDescription") : t("learningHub.submittedDescription"),
      });
    } catch (err) {
      show({ variant: "error", title: t("learningHub.submitError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--sb-text-muted)]">{t("learningHub.notFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/learning-hub")}>
          {t("learningHub.backToHub")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.back()} className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]">
        &larr; {t("learningHub.backToHub")}
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{challenge.title}</h1>
            <p className="text-xs text-[var(--sb-text-muted)]">{challenge.company?.name}</p>
          </div>
          <StatusPill tone="neutral">{challenge.difficulty}</StatusPill>
        </div>
        <p className="mt-3 text-sm text-[var(--sb-text-muted)]">{challenge.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--sb-text-faint)]">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {challenge.durationMinutes} {t("learningHub.minutes")}
          </span>
          <span>{t("learningHub.passingScore")}: {challenge.passingScore}%</span>
          <span>{challenge.skillCategory}</span>
        </div>
      </Card>

      {!submission && (
        <Card className="p-5 text-center">
          <p className="text-sm text-[var(--sb-text-muted)]">{t("learningHub.startHint")}</p>
          <Button className="mt-4" onClick={handleStart}>
            {t("learningHub.startChallenge")}
          </Button>
        </Card>
      )}

      {submission && submission.status === "IN_PROGRESS" && (
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{t("learningHub.yourResponse")}</p>
            <AutosaveIndicator status={autosaveStatus} onRetry={saveNow} />
          </div>
          <Textarea
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            placeholder={t("learningHub.responsePlaceholder")}
            className="min-h-48"
          />
          <Button className="mt-4" onClick={handleSubmit} loading={submitting}>
            {t("learningHub.submitChallenge")}
          </Button>
        </Card>
      )}

      {submission && (submission.status === "GRADED" || submission.status === "REVIEW_REQUIRED") && (
        <Card className="p-6 text-center">
          {submission.status === "REVIEW_REQUIRED" ? (
            <>
              <p className="text-sm font-medium text-[var(--sb-text)]">{t("learningHub.reviewRequiredTitle")}</p>
              <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("learningHub.reviewRequiredBody")}</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]">
                <Award size={26} />
              </div>
              <p className="mt-3 text-2xl font-bold">{submission.score}%</p>
              <p className="text-sm text-[var(--sb-text-muted)]">
                {(submission.score ?? 0) >= challenge.passingScore
                  ? t("learningHub.youPassed")
                  : t("learningHub.youNeed", { score: challenge.passingScore })}
              </p>
            </>
          )}
          <Button variant="secondary" className="mt-4" onClick={() => router.push("/skills-badges")}>
            {t("learningHub.viewSkillsBadges")}
          </Button>
        </Card>
      )}
    </div>
  );
}
