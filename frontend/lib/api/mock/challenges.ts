import {
  ApiError,
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

    const submission = {
      uuid: crypto.randomUUID(),
      status: "IN_PROGRESS" as const,
      score: null,
      startedAt: new Date().toISOString(),
      challenge,
      userUuid: user.uuid,
    };
    db.submissions.unshift(submission);
    saveDb(db);
    return submission;
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
