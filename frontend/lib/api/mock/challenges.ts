import {
  ApiError,
  type ChallengeResource,
  type ChallengeSubmission,
  type Paginated,
  type SkillBadge,
  type SkillChallenge,
} from "../types";
import type { ChallengeQuestionInput } from "../real/challenges";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

// Mirrors backend/src/challenges/challenges.service.ts#stripAnswers - the
// mock db stores the full question (with the correct answer) so submit()
// can grade it, but list()/get() must never hand that back to the caller.
function stripAnswers(challenge: SkillChallenge): SkillChallenge {
  if (!challenge.questions) return challenge;
  return {
    ...challenge,
    questions: challenge.questions.map(({ id, prompt, options, points }) => ({ id, prompt, options, points })),
  };
}

export const challengesApiMock = {
  async list(query?: {
    sector?: string;
    skillCategory?: string;
    search?: string;
    companyUuid?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<SkillChallenge>> {
    await mockLatency();
    const db = getDb();
    const search = query?.search?.toLowerCase().trim();
    const items = db.challenges.filter((challenge) => {
      if (query?.sector && challenge.sector !== query.sector) return false;
      if (query?.skillCategory && challenge.skillCategory !== query.skillCategory) return false;
      if (query?.companyUuid && challenge.company?.uuid !== query.companyUuid) return false;
      if (search) {
        return (
          challenge.title.toLowerCase().includes(search) ||
          challenge.skillCategory.toLowerCase().includes(search)
        );
      }
      return true;
    });
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit).map(stripAnswers),
      meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
    };
  },

  async get(uuid: string): Promise<SkillChallenge> {
    await mockLatency();
    const db = getDb();
    const challenge = db.challenges.find((candidate) => candidate.uuid === uuid);
    if (!challenge) throw new ApiError(`Challenge ${uuid} was not found.`, 404);
    return stripAnswers(challenge);
  },

  async start(uuid: string): Promise<ChallengeSubmission> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const challenge = db.challenges.find((candidate) => candidate.uuid === uuid);
    if (!challenge) throw new ApiError(`Challenge ${uuid} was not found.`, 404);

    const lock = db.submissions.find(
      (candidate) =>
        candidate.challenge.uuid === uuid &&
        candidate.userUuid === user.uuid &&
        candidate.lockedUntil &&
        new Date(candidate.lockedUntil) > new Date(),
    );
    if (lock) {
      throw new ApiError(
        `You left this test in progress and it was locked. You can retry after ${lock.lockedUntil}.`,
        403,
      );
    }

    const submission = {
      uuid: crypto.randomUUID(),
      status: "IN_PROGRESS" as const,
      score: null,
      startedAt: new Date().toISOString(),
      lockedUntil: null as string | null,
      // Answer-bearing questions travel with the submission so submit() can
      // grade it, same as the real backend loading them straight from the
      // DB - the caller only ever sees the stripped challenge from get().
      challenge: stripAnswers(challenge),
      // db.challenges stores the full answer-bearing questions at runtime
      // even though SkillChallenge's type narrows them to the public shape
      // (see stripAnswers) - safe to widen back out here, mock-DB-internal.
      fullQuestions: (challenge.questions ?? []) as unknown as ChallengeQuestionInput[],
      userUuid: user.uuid,
    };
    db.submissions.unshift(submission);
    saveDb(db);
    return submission;
  },

  async failIntegrity(submissionUuid: string): Promise<ChallengeSubmission> {
    await mockLatency(100, 250);
    const db = getDb();
    const submission = db.submissions.find((candidate) => candidate.uuid === submissionUuid);
    if (!submission) throw new ApiError("Submission not found.", 404);

    if (submission.status === "IN_PROGRESS") {
      submission.status = "INTEGRITY_FAILED";
      submission.lockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    saveDb(db);
    return submission;
  },

  // Employer-only mock - creates either a job pre-screen test (Google Form
  // link via `resources`, see app/employer/jobs/new) or a Learning Hub
  // skill test (in-app multiple-choice `questions`, see
  // app/employer/skill-tests/new).
  async create(
    _companyUuid: string,
    body: {
      title: string;
      description: string;
      sector: string;
      skillCategory: string;
      difficulty?: string;
      durationMinutes?: number;
      passingScore?: number;
      status?: string;
      resources?: ChallengeResource[];
      questions?: ChallengeQuestionInput[];
    },
  ): Promise<SkillChallenge> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const employerCompany = db.companies.find((company) => db.companyOwners[company.uuid] === user.uuid);
    const challenge: SkillChallenge = {
      uuid: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      sector: body.sector,
      skillCategory: body.skillCategory,
      difficulty: (body.difficulty as SkillChallenge["difficulty"]) ?? "BEGINNER",
      audience: "ALL_YOUTH",
      durationMinutes: body.durationMinutes ?? 60,
      passingScore: body.passingScore ?? 70,
      status: (body.status as SkillChallenge["status"]) ?? "PUBLISHED",
      resources: body.resources ?? [],
      questions: body.questions,
      company: employerCompany,
      createdAt: new Date().toISOString(),
    };
    db.challenges.unshift(challenge);
    saveDb(db);
    return stripAnswers(challenge);
  },

  async autosave(
    submissionUuid: string,
    _body: { responseText?: string; responseUrl?: string; responses?: Record<string, string> },
  ): Promise<ChallengeSubmission> {
    await mockLatency(100, 250);
    const db = getDb();
    const submission = db.submissions.find((candidate) => candidate.uuid === submissionUuid);
    if (!submission) throw new ApiError("Submission not found.", 404);
    saveDb(db);
    return submission;
  },

  async submit(
    submissionUuid: string,
    body: { responseText?: string; responseUrl?: string; responses?: Record<string, string> },
  ): Promise<ChallengeSubmission> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const submission = db.submissions.find((candidate) => candidate.uuid === submissionUuid);
    if (!submission) throw new ApiError("Submission not found.", 404);

    const objectiveQuestions = (submission.fullQuestions ?? []).filter((question) => question.answer !== undefined);
    let score: number;

    if (objectiveQuestions.length > 0) {
      const responses = body.responses ?? {};
      const total = objectiveQuestions.reduce((sum, question) => sum + (question.points ?? 1), 0);
      const earned = objectiveQuestions.reduce((sum, question) => {
        const actual = responses[question.id];
        return String(actual).trim().toLowerCase() === String(question.answer).trim().toLowerCase()
          ? sum + (question.points ?? 1)
          : sum;
      }, 0);
      score = Math.round((earned / Math.max(total, 1)) * 100);
    } else {
      // No stored answer key (e.g. an externally-proctored job pre-screen) -
      // simulate a plausible score from having submitted something at all.
      const hasResponse = Boolean(body.responseText?.trim() || body.responseUrl?.trim());
      score = hasResponse ? Math.floor(70 + Math.random() * 30) : 45;
    }

    submission.status = "GRADED";
    submission.score = score;

    if (score >= submission.challenge.passingScore) {
      const badge: SkillBadge & { userUuid: string } = {
        uuid: crypto.randomUUID(),
        name: `${submission.challenge.skillCategory} Verified Badge`,
        skillName: submission.challenge.skillCategory,
        score,
        status: "ISSUED",
        verifyUrl: `/badges/verify/${crypto.randomUUID()}`,
        issuedAt: new Date().toISOString(),
        challenge: { title: submission.challenge.title },
        company: submission.challenge.company,
        userUuid: user.uuid,
      };
      db.badges.unshift(badge);

      const profile = user.profile;
      if (profile) {
        profile.verifiedBadgeCount += 1;
      }

      db.notifications.unshift({
        uuid: crypto.randomUUID(),
        type: "BADGE_EARNED",
        channel: "IN_APP",
        subject: "You earned a new badge",
        body: `You earned the ${badge.name} badge.`,
        status: "SENT",
        readAt: null,
        createdAt: new Date().toISOString(),
        userUuid: user.uuid,
      });
    }

    saveDb(db);
    return submission;
  },

  async myBadges(userUuid: string): Promise<SkillBadge[]> {
    await mockLatency();
    const db = getDb();
    return db.badges.filter((badge) => badge.userUuid === userUuid);
  },
};
