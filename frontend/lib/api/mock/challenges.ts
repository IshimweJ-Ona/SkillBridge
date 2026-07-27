import {
  ApiError,
  type ChallengeResource,
  type ChallengeSubmission,
  type Paginated,
  type SkillBadge,
  type SkillChallenge,
} from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

export const challengesApiMock = {
  async list(query?: {
    sector?: string;
    skillCategory?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<SkillChallenge>> {
    await mockLatency();
    const db = getDb();
    const search = query?.search?.toLowerCase().trim();
    const items = db.challenges.filter((challenge) => {
      if (query?.sector && challenge.sector !== query.sector) return false;
      if (query?.skillCategory && challenge.skillCategory !== query.skillCategory) return false;
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
      items: items.slice(start, start + limit),
      meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
    };
  },

  async get(uuid: string): Promise<SkillChallenge> {
    await mockLatency();
    const db = getDb();
    const challenge = db.challenges.find((candidate) => candidate.uuid === uuid);
    if (!challenge) throw new ApiError(`Challenge ${uuid} was not found.`, 404);
    return challenge;
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
      challenge,
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

  // Employer-only mock - creates a challenge to attach as a job's pre-screen
  // test (see app/employer/jobs/new).
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
    },
  ): Promise<SkillChallenge> {
    await mockLatency();
    const db = getDb();
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
      createdAt: new Date().toISOString(),
    };
    db.challenges.unshift(challenge);
    saveDb(db);
    return challenge;
  },

  async autosave(
    submissionUuid: string,
    _body: { responseText?: string; responseUrl?: string },
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
    body: { responseText?: string; responseUrl?: string },
  ): Promise<ChallengeSubmission> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const submission = db.submissions.find((candidate) => candidate.uuid === submissionUuid);
    if (!submission) throw new ApiError("Submission not found.", 404);

    const hasResponse = Boolean(body.responseText?.trim() || body.responseUrl?.trim());
    const score = hasResponse ? Math.floor(70 + Math.random() * 30) : 45;
    submission.status = "GRADED";
    submission.score = score;

    if (score >= submission.challenge.passingScore) {
      const badge: SkillBadge & { userUuid: string } = {
        uuid: crypto.randomUUID(),
        name: `${submission.challenge.skillCategory} ${score >= 90 ? "Expert" : "Verified"}`,
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
