import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CompanyStatus,
  JobStatus,
  Prisma,
  Role,
  SubscriptionPlan,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/current-user.decorator';

// Job applications are read by the applicant themselves AND by the
// employer reviewing candidates - `include: { user: true }` would pull the
// full row, including passwordHash, straight into the API response. Only
// ever select the safe subset below for an application's nested user.
const applicantSelect = {
  uuid: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  location: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

const applicantWithProfileSelect = {
  ...applicantSelect,
  profile: true,
} satisfies Prisma.UserSelect;

// Same concern as applicantSelect above, for a company's owner/verifier:
// `GET /companies` has no @Roles() restriction (any authenticated user can
// browse it), so `include: { owner: true }` was handing every visitor the
// bcrypt passwordHash of every employer who owns a company, plus every
// admin who has ever verified one.
const companyContactSelect = {
  uuid: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createCompany(ownerUuid: string, body: Record<string, unknown>) {
    const owner = await this.prisma.user.findUnique({
      where: { uuid: ownerUuid },
      select: { id: true },
    });

    if (!owner) throw new NotFoundException(`User ${ownerUuid} was not found.`);

    return this.prisma.company.create({
      data: {
        ownerUserId: owner.id,
        name: this.requiredString(body.name, 'name'),
        description: this.optionalString(body.description),
        sector: this.optionalString(body.sector),
        location: this.optionalString(body.location),
        website: this.optionalString(body.website),
        logoUrl: this.optionalString(body.logoUrl),
      },
      include: { owner: { select: companyContactSelect } },
    });
  }

  async listCompanies(query: Record<string, string | undefined>) {
    const where: Prisma.CompanyWhereInput = {
      status: query.status as CompanyStatus | undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sector: { contains: query.search, mode: 'insensitive' } },
            { location: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    return this.paginateCompanies(where, query);
  }

  /** Companies owned by the requesting employer - used by the Employer dashboard. */
  async myCompanies(userUuid: string) {
    const requesterId = await this.resolveRequesterId(userUuid);

    return this.prisma.company.findMany({
      where: { ownerUserId: requesterId },
      include: { owner: { select: companyContactSelect }, verifiedBy: { select: companyContactSelect } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Jobs posted under companies owned by the requesting employer. */
  async myJobs(userUuid: string) {
    const requesterId = await this.resolveRequesterId(userUuid);

    return this.prisma.jobPosting.findMany({
      where: { company: { ownerUserId: requesterId } },
      include: { company: true, preScreenChallenge: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyCompany(companyUuid: string, adminUuid: string) {
    const admin = await this.prisma.user.findUnique({
      where: { uuid: adminUuid },
      select: { id: true },
    });

    return this.prisma.company.update({
      where: { uuid: companyUuid },
      data: {
        status: CompanyStatus.VERIFIED,
        verifiedByUserId: admin?.id,
      },
      include: { owner: { select: companyContactSelect }, verifiedBy: { select: companyContactSelect } },
    });
  }

  async createJob(companyUuid: string, body: Record<string, unknown>, user: RequestUser) {
    const company = await this.prisma.company.findUnique({
      where: { uuid: companyUuid },
      select: { id: true, status: true },
    });

    if (!company) throw new NotFoundException(`Company ${companyUuid} was not found.`);
    await this.assertEmployerOwnsCompany(user, company.id);
    if (company.status !== CompanyStatus.VERIFIED) {
      throw new BadRequestException('Company must be verified before posting jobs.');
    }

    const job = await this.prisma.jobPosting.create({
      data: {
        companyId: company.id,
        preScreenChallengeId: await this.findChallengeId(body.preScreenChallengeUuid),
        title: this.requiredString(body.title, 'title'),
        description: this.requiredString(body.description, 'description'),
        requiredSkills: this.stringArray(body.requiredSkills),
        compensationRange: this.optionalString(body.compensationRange),
        location: this.optionalString(body.location),
        deadline: this.optionalDate(body.deadline),
        status: (body.status as JobStatus | undefined) ?? JobStatus.OPEN,
      },
      include: { company: true, preScreenChallenge: true },
    });

    if (job.status === JobStatus.OPEN) {
      await this.rankCandidates(job.uuid);
    }

    return job;
  }

  async listJobs(query: Record<string, string | undefined>) {
    const where: Prisma.JobPostingWhereInput = {
      status: query.includeClosed === 'true' ? undefined : JobStatus.OPEN,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { requiredSkills: { has: query.search } },
          ]
        : undefined,
    };
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.jobPosting.findMany({
        where,
        include: { company: true, preScreenChallenge: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findJob(uuid: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { uuid },
      include: {
        company: true,
        preScreenChallenge: true,
        matches: { orderBy: { score: 'desc' }, take: 20 },
      },
    });

    if (!job) throw new NotFoundException(`Job ${uuid} was not found.`);

    return job;
  }

  // `user` is omitted when called internally right after createJob (already
  // authorized at that point); required when reached via the controller.
  async rankCandidates(jobUuid: string, user?: RequestUser) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { uuid: jobUuid },
      include: { company: true },
    });

    if (!job) throw new NotFoundException(`Job ${jobUuid} was not found.`);
    if (user) await this.assertEmployerOwnsCompany(user, job.companyId);

    const profiles = await this.prisma.profile.findMany({
      where: {
        visibility: { in: ['PUBLIC', 'EMPLOYERS_ONLY'] },
        user: { status: 'ACTIVE', role: Role.YOUTH_USER },
      },
      include: {
        user: {
          include: {
            skillBadges: { where: { status: 'ISSUED' } },
            subscription: true,
          },
        },
      },
      take: 1000,
    });

    const matches = profiles.map((profile) => {
      const badgeScore = this.badgeMatchScore(job.requiredSkills, profile.user.skillBadges);
      const score = Math.round(badgeScore * 0.7 + profile.brandScore * 0.3);
      const subscribed = profile.user.subscription?.plan !== SubscriptionPlan.FREE;

      return {
        jobId: job.id,
        userId: profile.userId,
        score,
        badgeScore,
        brandScore: profile.brandScore,
        subscribed,
        notificationDueAt: new Date(
          Date.now() + (subscribed ? 24 : 5 * 24) * 60 * 60 * 1000,
        ),
      };
    });

    await this.prisma.$transaction(
      matches.map((match) =>
        this.prisma.jobMatch.upsert({
          where: { jobId_userId: { jobId: match.jobId, userId: match.userId } },
          create: match,
          update: match,
        }),
      ),
    );

    return this.prisma.jobMatch.findMany({
      where: { jobId: job.id },
      include: { user: { include: { profile: true } } },
      orderBy: { score: 'desc' },
      take: 50,
    });
  }

  async myMatches(userUuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    return this.prisma.jobMatch.findMany({
      where: { userId: user.id, job: { status: JobStatus.OPEN } },
      include: { job: { include: { company: true } } },
      orderBy: { score: 'desc' },
      take: 50,
    });
  }

  async apply(jobUuid: string, userUuid: string, body: Record<string, unknown>) {
    const [job, user] = await Promise.all([
      this.prisma.jobPosting.findUnique({ where: { uuid: jobUuid }, include: { company: true } }),
      this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true, email: true } }),
    ]);

    if (!job) throw new NotFoundException(`Job ${jobUuid} was not found.`);
    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    if (job.preScreenChallengeId) {
      const passed = await this.prisma.challengeSubmission.findFirst({
        where: {
          userId: user.id,
          challengeId: job.preScreenChallengeId,
          score: { gte: 60 },
        },
      });

      if (!passed) {
        throw new BadRequestException('You must pass the job pre-screen test before applying.');
      }
    }

    const match = await this.prisma.jobMatch.findUnique({
      where: { jobId_userId: { jobId: job.id, userId: user.id } },
    });
    const application = await this.prisma.jobApplication.create({
      data: {
        jobId: job.id,
        userId: user.id,
        coverLetter: this.optionalString(body.coverLetter),
        documentUrl: this.optionalString(body.documentUrl),
        matchScore: match?.score,
      },
      include: { job: { include: { company: true } }, user: { select: applicantSelect } },
    });

    await this.notificationsService.notifyApplicationStatusChange(
      user.id,
      job.title,
      job.company.name,
      'SUBMITTED',
    );

    return application;
  }

  async listApplications(user: RequestUser, query: Record<string, string | undefined>) {
    let where: Prisma.JobApplicationWhereInput;

    if (user.role === Role.YOUTH_USER) {
      where = { user: { uuid: user.sub } };
    } else if (user.role === Role.EMPLOYER) {
      // Scoped to the employer's own companies' jobs - previously this
      // branch returned applications platform-wide for any non-youth role.
      const requesterId = await this.resolveRequesterId(user.sub);
      where = {
        status: query.status as ApplicationStatus | undefined,
        job: {
          is: {
            uuid: query.jobUuid || undefined,
            company: { ownerUserId: requesterId },
          },
        },
      };
    } else {
      where = {
        status: query.status as ApplicationStatus | undefined,
        job: query.jobUuid ? { is: { uuid: query.jobUuid } } : undefined,
      };
    }

    return this.prisma.jobApplication.findMany({
      where,
      // Nests the applicant's profile so an employer viewing the applicant
      // list/detail can link straight to it via GET /profiles/:uuid without
      // a second lookup (GET /profiles/by-user/:userUuid is youth/admin-only).
      include: { job: { include: { company: true } }, user: { select: applicantWithProfileSelect } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateApplicationStatus(uuid: string, body: Record<string, unknown>, user: RequestUser) {
    const existing = await this.prisma.jobApplication.findUnique({
      where: { uuid },
      select: { job: { select: { companyId: true } } },
    });

    if (!existing) throw new NotFoundException(`Application ${uuid} was not found.`);
    await this.assertEmployerOwnsCompany(user, existing.job.companyId);

    const updated = await this.prisma.jobApplication.update({
      where: { uuid },
      data: {
        status: (body.status as ApplicationStatus | undefined) ?? ApplicationStatus.UNDER_REVIEW,
      },
      include: { job: { include: { company: true } }, user: { select: applicantSelect } },
    });

    await this.notificationsService.notifyApplicationStatusChange(
      updated.userId as number,
      updated.job.title,
      updated.job.company.name,
      updated.status,
    );

    return updated;
  }

  async confirmPlacement(jobUuid: string, body: Record<string, unknown>, user: RequestUser) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { uuid: jobUuid },
      include: { company: { include: { owner: true } } },
    });

    if (!job) throw new NotFoundException(`Job ${jobUuid} was not found.`);
    await this.assertEmployerOwnsCompany(user, job.companyId);

    const transaction = await this.prisma.$transaction(async (tx) => {
      const updatedJob = await tx.jobPosting.update({
        where: { id: job.id },
        data: { status: JobStatus.FILLED, placementConfirmedAt: new Date() },
      });
      const createdTransaction = await tx.transaction.create({
        data: {
          jobId: updatedJob.id,
          employerId: job.company.ownerUserId,
          type: TransactionType.HIRING_FEE,
          status: TransactionStatus.PENDING,
          amountCents: this.numberValue(body.amountCents, 1_000_000),
          currency: 'RWF',
          provider: 'mtn-momo',
          metadata: { feeDescription: '10,000 RWF hiring fee invoice' },
        },
      });

      return createdTransaction;
    });

    if (job.company.owner?.email && job.company.owner?.id) {
      await this.notificationsService.notifyInvoiceGenerated(
        job.company.owner.id,
        job.title,
        this.numberValue(body.amountCents, 1_000_000),
      );
    }

    return transaction;
  }

  private async paginateCompanies(
    where: Prisma.CompanyWhereInput,
    query: Record<string, string | undefined>,
  ) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        include: { owner: { select: companyContactSelect }, verifiedBy: { select: companyContactSelect } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  private badgeMatchScore(
    requiredSkills: string[],
    badges: Array<{ skillName: string }>,
  ) {
    if (!requiredSkills.length) return 0;
    const badgeSkills = new Set(badges.map((badge) => badge.skillName.toLowerCase()));
    const matched = requiredSkills.filter((skill) => badgeSkills.has(skill.toLowerCase()));
    return Math.round((matched.length / requiredSkills.length) * 100);
  }

  private async resolveRequesterId(userUuid: string): Promise<number> {
    const requester = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!requester) throw new UnauthorizedException('Authentication is required.');

    return requester.id;
  }

  /**
   * Verifies the requester may manage the given company. Administrators can
   * act on any company; employers must own it. Without this, any
   * authenticated employer could post jobs, update applications, or confirm
   * placements under a company they don't own (IDOR).
   */
  private async assertEmployerOwnsCompany(user: RequestUser, companyId: number) {
    if (user.role === Role.ADMINISTRATOR) return;

    const requesterId = await this.resolveRequesterId(user.sub);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerUserId: true },
    });

    if (!company || company.ownerUserId !== requesterId) {
      throw new ForbiddenException('You do not have permission to manage this company.');
    }
  }

  private async findChallengeId(value: unknown) {
    if (typeof value !== 'string' || !value) return undefined;
    const challenge = await this.prisma.skillChallenge.findUnique({
      where: { uuid: value },
      select: { id: true },
    });
    return challenge?.id;
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

  private stringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  }

  private optionalDate(value: unknown) {
    if (typeof value !== 'string' || !value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private numberValue(value: unknown, fallback: number) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? number : fallback;
  }
}
