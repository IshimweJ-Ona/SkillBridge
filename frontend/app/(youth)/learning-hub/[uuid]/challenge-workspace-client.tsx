"use client";

import { Award, Clock, ExternalLink, Loader2, Lock } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ApiError, challenges, type ChallengeSubmission, type SkillChallenge } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { useAutosave } from "@/lib/use-autosave";
import { formatDate } from "@/lib/utils";

export function ChallengeWorkspaceClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();

  const [challenge, setChallenge] = useState<SkillChallenge | null>(null);
  const [submission, setSubmission] = useState<ChallengeSubmission | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Refs so the timer/visibility effects below always see the latest
  // responses/submission without re-subscribing their listeners on every
  // answer change or re-render. Synced via effects, not during render, per
  // react-hooks/refs (mutating ref.current during render is unsafe).
  const responsesRef = useRef(responses);
  const submissionRef = useRef(submission);
  const autoEndedRef = useRef(false);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    submissionRef.current = submission;
  }, [submission]);

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
    responses,
    async (value) => {
      if (submission && submission.status === "IN_PROGRESS") {
        await challenges.autosave(submission.uuid, { responses: value });
      }
    },
    30000,
  );

  const handleStart = async () => {
    try {
      const created = await challenges.start(uuid);
      setSubmission(created);
      setResponses({});
    } catch (err) {
      show({ variant: "error", title: t("learningHub.startError"), description: err instanceof ApiError ? err.message : undefined });
    }
  };

  const handleSubmit = async () => {
    if (!submission) return;
    setSubmitting(true);
    try {
      const graded = await challenges.submit(submission.uuid, { responses });
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

  // Countdown from submission.startedAt + challenge.durationMinutes. Running
  // out of time auto-submits whatever answers exist so far - a fairness
  // expiry, not a punishment (unlike leaving the tab, below).
  useEffect(() => {
    if (!challenge || !submission || submission.status !== "IN_PROGRESS") {
      setRemainingSeconds(null);
      return;
    }

    autoEndedRef.current = false;
    const deadline = new Date(submission.startedAt).getTime() + challenge.durationMinutes * 60_000;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0 && !autoEndedRef.current && submissionRef.current?.status === "IN_PROGRESS") {
        autoEndedRef.current = true;
        challenges
          .submit(submissionRef.current.uuid, { responses: responsesRef.current })
          .then((graded) => setSubmission(graded))
          .catch(() => undefined);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [challenge, submission?.uuid, submission?.status, submission?.startedAt]);

  // Anti-cheat: if the tab hosting a timed, IN_PROGRESS test loses focus or
  // visibility for any reason, immediately fail the attempt server-side and
  // lock retries on this specific challenge for 7 days. This can't detect
  // *why* focus was lost (a real tab-switch looks identical to an accidental
  // alt-tab or a notification popup) - it's a deterrent, not tamper-proof
  // proctoring.
  useEffect(() => {
    if (!submission || submission.status !== "IN_PROGRESS") return;

    const handleVisibilityChange = () => {
      if (document.hidden && !autoEndedRef.current && submissionRef.current?.status === "IN_PROGRESS") {
        autoEndedRef.current = true;
        challenges
          .failIntegrity(submissionRef.current.uuid)
          .then((failed) => {
            setSubmission(failed);
            show({
              variant: "error",
              title: t("learningHub.integrityFailedTitle"),
              description: t("learningHub.integrityFailedToastDescription"),
            });
          })
          .catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submission?.uuid, submission?.status, show, t]);

  const externalTest = challenge?.resources?.find((resource) => resource.type === "external_test");
  const questions = challenge?.questions ?? [];
  const hasQuestions = questions.length > 0;
  const allAnswered = questions.every((question) => responses[question.id] !== undefined);

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

      {externalTest && !hasQuestions && (
        <Card className="p-5">
          <p className="text-sm font-medium">{t("learningHub.externalTestTitle")}</p>
          <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("learningHub.externalTestBody")}</p>
          <a
            href={externalTest.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--sb-radius-md)] bg-[var(--sb-primary)] px-4 py-2 text-sm font-medium text-[var(--sb-primary-foreground)] hover:bg-[var(--sb-primary-hover)]"
          >
            {t("learningHub.openTest")} <ExternalLink size={14} />
          </a>
        </Card>
      )}

      {hasQuestions && !submission && (
        <Card className="p-5 text-center">
          <p className="text-sm text-[var(--sb-text-muted)]">{t("learningHub.startHint")}</p>
          <Button className="mt-4" onClick={handleStart}>
            {t("learningHub.openTest")}
          </Button>
        </Card>
      )}

      {hasQuestions && submission && submission.status === "IN_PROGRESS" && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium">{t("learningHub.yourAnswers")}</p>
            <div className="flex items-center gap-3">
              {remainingSeconds !== null && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    remainingSeconds < 60 ? "text-[var(--sb-danger)]" : "text-[var(--sb-text-faint)]"
                  }`}
                >
                  <Clock size={12} />
                  {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                  {String(remainingSeconds % 60).padStart(2, "0")}
                </span>
              )}
              <AutosaveIndicator status={autosaveStatus} onRetry={saveNow} />
            </div>
          </div>
          <p className="mb-4 text-xs text-[var(--sb-text-faint)]">{t("learningHub.integrityWarning")}</p>

          <div className="space-y-5">
            {questions.map((question, questionIndex) => (
              <div key={question.id}>
                <p className="text-sm font-medium text-[var(--sb-text)]">
                  {questionIndex + 1}. {question.prompt}
                </p>
                <div className="mt-2 space-y-1.5">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex items-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] px-3 py-2 text-sm text-[var(--sb-text)] hover:bg-[var(--sb-bg-panel-hover)]"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={responses[question.id] === String(optionIndex)}
                        onChange={() => setResponses((current) => ({ ...current, [question.id]: String(optionIndex) }))}
                        className="h-4 w-4 shrink-0 border-[var(--sb-border)]"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button className="mt-5" onClick={handleSubmit} loading={submitting} disabled={!allAnswered}>
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

      {submission && (submission.status === "INTEGRITY_FAILED" || submission.status === "EXPIRED") && (
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]">
            <Lock size={24} />
          </div>
          {submission.status === "INTEGRITY_FAILED" ? (
            <>
              <p className="mt-3 text-sm font-medium text-[var(--sb-text)]">{t("learningHub.integrityFailedTitle")}</p>
              <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
                {submission.lockedUntil
                  ? t("learningHub.integrityFailedBody", { date: formatDate(submission.lockedUntil) })
                  : t("learningHub.integrityFailedBodyFallback")}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium text-[var(--sb-text)]">{t("learningHub.timeExpiredTitle")}</p>
              <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("learningHub.timeExpiredBody")}</p>
            </>
          )}
          <Button variant="secondary" className="mt-4" onClick={() => router.push("/learning-hub")}>
            {t("learningHub.backToHub")}
          </Button>
        </Card>
      )}
    </div>
  );
}
