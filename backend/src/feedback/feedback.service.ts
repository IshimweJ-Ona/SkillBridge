import { Injectable, NotFoundException } from '@nestjs/common';
import { FeedbackAudience, FeedbackStatus, Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { renderBrandedEmail } from '../email/templates';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ListFeedbackQueryDto } from './dto/list-feedback-query.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

const feedbackInclude = {
  user: {
    select: {
      uuid: true,
      email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
    },
  },
} satisfies Prisma.FeedbackInclude;

type FeedbackWithUser = Prisma.FeedbackGetPayload<{
  include: typeof feedbackInclude;
}>;

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto) {
    const { userUuid, ...feedbackData } = createFeedbackDto;
    const user = userUuid
      ? await this.prisma.user.findUnique({
          where: { uuid: userUuid },
          select: { id: true },
        })
      : null;

    if (userUuid && !user) {
      throw new NotFoundException(`User ${userUuid} was not found.`);
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        ...feedbackData,
        userId: user?.id,
      },
      include: feedbackInclude,
    });

    const notification = await this.sendFeedbackNotification(feedback);

    return { feedback, notification };
  }

  async findAll(filters: ListFeedbackQueryDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.FeedbackWhereInput = {
      audience: filters.audience,
      status: filters.status,
      rating: filters.rating,
      user: filters.userUuid ? { is: { uuid: filters.userUuid } } : undefined,
      OR: filters.search
        ? [
            { subject: { contains: filters.search, mode: 'insensitive' } },
            { message: { contains: filters.search, mode: 'insensitive' } },
            { contactName: { contains: filters.search, mode: 'insensitive' } },
            { contactEmail: { contains: filters.search, mode: 'insensitive' } },
            {
              organizationName: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
            {
              user: {
                is: {
                  OR: [
                    {
                      firstName: {
                        contains: filters.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      lastName: {
                        contains: filters.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      email: {
                        contains: filters.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: feedbackInclude,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary() {
    const audiences = Object.values(FeedbackAudience);
    const [total, fresh, inReview, actioned, archived, average, ...audienceCounts] =
      await this.prisma.$transaction([
        this.prisma.feedback.count(),
        this.prisma.feedback.count({ where: { status: FeedbackStatus.NEW } }),
        this.prisma.feedback.count({
          where: { status: FeedbackStatus.IN_REVIEW },
        }),
        this.prisma.feedback.count({
          where: { status: FeedbackStatus.ACTIONED },
        }),
        this.prisma.feedback.count({
          where: { status: FeedbackStatus.ARCHIVED },
        }),
        this.prisma.feedback.aggregate({ _avg: { rating: true } }),
        ...audiences.map((audience) =>
          this.prisma.feedback.count({ where: { audience } }),
        ),
      ]);

    return {
      total,
      new: fresh,
      inReview,
      actioned,
      archived,
      averageRating: Number((average._avg.rating ?? 0).toFixed(1)),
      byAudience: audiences.map((audience, index) => ({
        audience,
        count: audienceCounts[index],
      })),
    };
  }

  async findOne(uuid: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { uuid },
      include: feedbackInclude,
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback ${uuid} was not found.`);
    }

    return feedback;
  }

  async update(uuid: string, updateFeedbackDto: UpdateFeedbackDto) {
    await this.findOne(uuid);

    return this.prisma.feedback.update({
      where: { uuid },
      data: updateFeedbackDto,
      include: feedbackInclude,
    });
  }

  async updateStatus(uuid: string, status: FeedbackStatus) {
    await this.findOne(uuid);

    return this.prisma.feedback.update({
      where: { uuid },
      data: { status },
      include: feedbackInclude,
    });
  }

  async remove(uuid: string) {
    await this.findOne(uuid);

    return this.prisma.feedback.delete({
      where: { uuid },
      include: feedbackInclude,
    });
  }

  private async sendFeedbackNotification(feedback: FeedbackWithUser) {
    return this.emailService.send({
      to: [process.env.RESEND_FEEDBACK_TO_EMAIL ?? ''],
      subject: `SkillBridge feedback: ${feedback.subject}`,
      text: this.formatFeedbackMessage(feedback),
      html: renderBrandedEmail({
        heading: `New feedback: ${feedback.subject}`,
        paragraphs: this.formatFeedbackLines(feedback),
        footerNote: 'Internal notification - review and update the status from the Analyst/Admin dashboard.',
      }),
    });
  }

  private formatFeedbackMessage(feedback: FeedbackWithUser) {
    return [...this.formatFeedbackLines(feedback), '', feedback.message].join('\n');
  }

  private formatFeedbackLines(feedback: FeedbackWithUser): string[] {
    const submitter = feedback.user
      ? `${feedback.user.firstName} ${feedback.user.lastName} <${feedback.user.email ?? feedback.user.phone ?? 'No contact'}>`
      : feedback.contactEmail ?? 'Anonymous feedback';

    return [
      `Audience: ${feedback.audience}`,
      `Status: ${feedback.status}`,
      `Rating: ${feedback.rating ?? 'Not provided'}`,
      `Subject: ${feedback.subject}`,
      `Submitter: ${submitter}`,
      `Contact name: ${feedback.contactName ?? 'Not provided'}`,
      `Contact email: ${feedback.contactEmail ?? 'Not provided'}`,
      `Organization: ${feedback.organizationName ?? 'Not provided'}`,
      `Source: ${feedback.source}`,
      `Tags: ${feedback.tags.length ? feedback.tags.join(', ') : 'None'}`,
      `Submitted at: ${feedback.createdAt.toISOString()}`,
      feedback.message,
    ];
  }
}
