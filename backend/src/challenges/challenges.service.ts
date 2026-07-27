import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChallengeStatus, ChallengeSubmissionStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';

type ChallengeQuestion = {
  id?: string;
  prompt?: string;
  answer?: string | number | boolean;
  points?: number;
};

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createChallenge(companyUuid: string, body: Record<string, unknown>) {
    const company = await this.prisma.company.findUnique({
      where: { uuid: companyUuid },
      select: { id: true },
    });

    if (!company) throw new NotFoundException(`Company ${companyUuid} was not found.`);

    return this.prisma.skillChallenge.create({
      data: {
        companyId: company.id,
        title: this.requiredString(body.title, 'title'),
        description: this.requiredString(body.description, 'description'),
        sector: this.requiredString(body.sector, 'sector'),
        skillCategory: this.requiredString(body.skillCategory, 'skillCategory'),
        difficulty: this.enumValue(body.difficulty, 'BEGINNER'),
        audience: this.enumValue(body.audience, 'ALL_YOUTH'),
        durationMinutes: this.numberValue(body.durationMinutes, 60),
        passingScore: this.numberValue(body.passingScore, 70),
        status: this.enumValue(body.status, ChallengeStatus.DRAFT),
        questions: this.jsonArray(body.questions),
        resources: this.jsonArray(body.resources),
      },
      include: { company: true },
    });
  }

  async listChallenges(query: Record<string, string | undefined>) {
    const where: Prisma.SkillChallengeWhereInput = {
      status: query.includeDrafts === 'true' ? undefined : ChallengeStatus.PUBLISHED,
      sector: query.sector,
      skillCategory: query.skillCategory,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { skillCategory: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.skillChallenge.findMany({
        where,
        include: { company: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.skillChallenge.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findChallenge(uuid: string) {
    const challenge = await this.prisma.skillChallenge.findUnique({
      where: { uuid },
      include: { company: true },
    });

    if (!challenge) throw new NotFoundException(`Challenge ${uuid} was not found.`);

    return challenge;
  }

  async startChallenge(challengeUuid: string, userUuid: string) {
    const [challenge, user] = await Promise.all([
      this.prisma.skillChallenge.findUnique({ where: { uuid: challengeUuid } }),
      this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true } }),
    ]);

    if (!challenge) throw new NotFoundException(`Challenge ${challengeUuid} was not found.`);
    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);
    if (challenge.status !== ChallengeStatus.PUBLISHED) {
      throw new BadRequestException('This challenge is not published.');
    }

    const lock = await this.prisma.challengeSubmission.findFirst({
      where: { challengeId: challenge.id, userId: user.id, lockedUntil: { gt: new Date() } },
      orderBy: { lockedUntil: 'desc' },
      select: { lockedUntil: true },
    });
    if (lock) {
      throw new ForbiddenException(
        `You left this test in progress and it was locked. You can retry after ${lock.lockedUntil!.toISOString()}.`,
      );
    }

    return this.prisma.challengeSubmission.create({
      data: {
        challengeId: challenge.id,
        userId: user.id,
        expiresAt: new Date(Date.now() + challenge.durationMinutes * 60_000),
      },
      include: { challenge: true },
    });
  }

  async autosaveSubmission(
    submissionUuid: string,
    userUuid: string,
    body: Record<string, unknown>,
  ) {
    const submission = await this.findOwnedSubmission(submissionUuid, userUuid);

    return this.prisma.challengeSubmission.update({
      where: { id: submission.id },
      data: {
        responseText: this.optionalString(body.responseText),
        responseUrl: this.optionalString(body.responseUrl),
        responses: this.jsonObject(body.responses),
        autoSavedAt: new Date(),
      },
      include: { challenge: true },
    });
  }

  async submitChallenge(
    submissionUuid: string,
    userUuid: string,
    body: Record<string, unknown>,
  ) {
    const submission = await this.findOwnedSubmission(submissionUuid, userUuid);

    if (submission.expiresAt && submission.expiresAt < new Date()) {
      return this.prisma.challengeSubmission.update({
        where: { id: submission.id },
        data: { status: ChallengeSubmissionStatus.EXPIRED },
      });
    }

    const responses = this.jsonObject(body.responses);
    const grading = this.grade(submission.challenge.questions, responses);
    const status = grading.reviewRequired
      ? ChallengeSubmissionStatus.REVIEW_REQUIRED
      : ChallengeSubmissionStatus.GRADED;

    const updated = await this.prisma.challengeSubmission.update({
      where: { id: submission.id },
      data: {
        responseText: this.optionalString(body.responseText),
        responseUrl: this.optionalString(body.responseUrl),
        responses,
        score: grading.score,
        feedback: grading.feedback,
        status,
        submittedAt: new Date(),
        gradedAt: grading.reviewRequired ? null : new Date(),
      },
      include: {
        challenge: { include: { company: true } },
        user: { include: { subscription: true } },
      },
    });

    if (!grading.reviewRequired && grading.score >= updated.challenge.passingScore) {
      await this.issueBadge(updated);
    }

    return this.prisma.challengeSubmission.findUnique({
      where: { id: updated.id },
      include: { challenge: { include: { company: true } }, badge: true },
    });
  }

  // Called the instant the browser tab hosting a timed, IN_PROGRESS test
  // loses focus/visibility - see challenge-workspace-client.tsx. Locks this
  // (user, challenge) pair for 7 days, checked by startChallenge above.
  async failIntegrity(submissionUuid: string, userUuid: string) {
    const submission = await this.findOwnedSubmission(submissionUuid, userUuid);

    if (submission.status !== ChallengeSubmissionStatus.IN_PROGRESS) {
      return submission;
    }

    const lockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.challengeSubmission.update({
      where: { id: submission.id },
      data: {
        status: ChallengeSubmissionStatus.INTEGRITY_FAILED,
        lockedUntil,
        submittedAt: new Date(),
      },
      include: { challenge: true },
    });
  }

  async listBadges(userUuid: string) {
    return this.prisma.skillBadge.findMany({
      where: { user: { uuid: userUuid }, status: 'ISSUED' },
      include: { company: true, challenge: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async verifyBadge(uuid: string) {
    // This endpoint is @Public() (badge.verifyUrl is meant to be shared with
    // anyone, e.g. an employer checking a credential), so the nested user
    // must never carry more than the name - `include: { user: true }` would
    // have exposed the badge holder's passwordHash to an unauthenticated caller.
    const badge = await this.prisma.skillBadge.findUnique({
      where: { uuid },
      include: {
        user: { select: { firstName: true, lastName: true } },
        company: true,
        challenge: true,
      },
    });

    if (!badge || badge.status !== 'ISSUED') {
      throw new NotFoundException(`Badge ${uuid} was not found.`);
    }

    return badge;
  }

  private async findOwnedSubmission(submissionUuid: string, userUuid: string) {
    const submission = await this.prisma.challengeSubmission.findFirst({
      where: { uuid: submissionUuid, user: { uuid: userUuid } },
      include: { challenge: true },
    });

    if (!submission) {
      throw new NotFoundException(`Challenge submission ${submissionUuid} was not found.`);
    }

    return submission;
  }

  private grade(questionsJson: unknown, responsesJson: unknown) {
    const questions = Array.isArray(questionsJson) ? (questionsJson as ChallengeQuestion[]) : [];
    const responses =
      typeof responsesJson === 'object' && responsesJson !== null && !Array.isArray(responsesJson)
        ? (responsesJson as Record<string, unknown>)
        : {};
    const objective = questions.filter((question) => question.answer !== undefined);

    if (!objective.length) {
      return {
        reviewRequired: true,
        score: 0,
        feedback: { message: 'Submission requires employer review within 72 hours.' },
      };
    }

    const total = objective.reduce((sum, question) => sum + (question.points ?? 1), 0);
    const earned = objective.reduce((sum, question, index) => {
      const key = question.id ?? String(index);
      const actual = responses[key];
      const expected = question.answer;
      return String(actual).trim().toLowerCase() === String(expected).trim().toLowerCase()
        ? sum + (question.points ?? 1)
        : sum;
    }, 0);
    const score = Math.round((earned / Math.max(total, 1)) * 100);

    return {
      reviewRequired: false,
      score,
      feedback: {
        earned,
        total,
        resources:
          score >= 70
            ? []
            : ['Google Career Certificates', 'ALX modules', 'Coursera guided practice'],
      },
    };
  }

  private async issueBadge(submission: {
    id: number;
    score: number | null;
    challenge: { id: number; title: string; skillCategory: string; companyId: number; company: { name: string } };
    user: { id: number; email: string | null; subscription: { status: SubscriptionStatus } | null };
  }) {
    if (submission.user.subscription?.status !== SubscriptionStatus.ACTIVE) return;

    const existing = await this.prisma.skillBadge.findUnique({
      where: { submissionId: submission.id },
    });

    if (existing) return;

    const badge = await this.prisma.skillBadge.create({
      data: {
        userId: submission.user.id,
        challengeId: submission.challenge.id,
        companyId: submission.challenge.companyId,
        submissionId: submission.id,
        name: `${submission.challenge.skillCategory} Verified Badge`,
        skillName: submission.challenge.skillCategory,
        score: submission.score ?? 0,
        // ChallengesModule (and this badges/verify route) is only mounted in
        // learning-api - a URL built from identity-api's base would 404.
        verifyUrl: `${process.env.LEARNING_API_PUBLIC_URL ?? 'http://localhost:3102/api/v1'}/badges/verify`,
      },
    });

    await this.profilesService.recomputeScoresByUserId(submission.user.id);
    await this.notificationsService.notifyBadgeEarned(
      submission.user.id,
      badge.name,
      submission.challenge.skillCategory,
      submission.score ?? 0,
    );
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required.`);
    }

    return value.trim();
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private numberValue(value: unknown, fallback: number) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? number : fallback;
  }

  private enumValue<T extends string>(value: unknown, fallback: T) {
    return typeof value === 'string' && value ? (value as T) : fallback;
  }

  private jsonArray(value: unknown): Prisma.InputJsonValue {
    return Array.isArray(value) ? (value as Prisma.InputJsonArray) : [];
  }

  private jsonObject(value: unknown): Prisma.InputJsonValue {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Prisma.InputJsonObject)
      : {};
  }
}
