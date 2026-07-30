import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { RequestUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

const subscriptionInclude = {
  user: {
    select: {
      uuid: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.SubscriptionInclude;

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ListSubscriptionsQueryDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.SubscriptionWhereInput = {
      plan: filters.plan,
      status: filters.status,
      user: filters.userUuid ? { is: { uuid: filters.userUuid } } : undefined,
      OR: filters.search
        ? [
            { providerCustomerId: { contains: filters.search, mode: 'insensitive' } },
            { providerReference: { contains: filters.search, mode: 'insensitive' } },
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
      this.prisma.subscription.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: subscriptionInclude,
      }),
      this.prisma.subscription.count({ where }),
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
    const plans = Object.values(SubscriptionPlan);
    const [total, active, trialing, pastDue, ...planCounts] =
      await this.prisma.$transaction([
        this.prisma.subscription.count(),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.TRIALING },
        }),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.PAST_DUE },
        }),
        ...plans.map((plan) => this.prisma.subscription.count({ where: { plan } })),
      ]);

    return {
      total,
      active,
      trialing,
      pastDue,
      byPlan: plans.map((plan, index) => ({
        plan,
        count: planCounts[index],
      })),
    };
  }

  async findByUser(userUuid: string, requester?: RequestUser) {
    this.assertCanAccessUserSubscription(userUuid, requester);

    const subscription = await this.prisma.subscription.findFirst({
      where: { user: { uuid: userUuid } },
      include: subscriptionInclude,
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription for user ${userUuid} was not found.`);
    }

    return subscription;
  }

  async updateByUser(
    userUuid: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    requester?: RequestUser,
  ) {
    this.assertCanAccessUserSubscription(userUuid, requester);

    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userUuid} was not found.`);
    }

    const data =
      requester?.role === Role.ADMINISTRATOR
        ? updateSubscriptionDto
        : {
            plan: updateSubscriptionDto.plan,
            provider: 'manual',
            status: SubscriptionStatus.ACTIVE,
            priceCents:
              updateSubscriptionDto.plan === SubscriptionPlan.EMPLOYER_PARTNER
                ? 4900
                : updateSubscriptionDto.plan === SubscriptionPlan.YOUTH_PRO
                  ? 1900
                  : 0,
            currency: 'RWF',
          };

    return this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        plan: data.plan ?? SubscriptionPlan.FREE,
        status: data.status ?? SubscriptionStatus.ACTIVE,
        priceCents: data.priceCents ?? 0,
        currency: data.currency ?? 'RWF',
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        provider: data.provider ?? 'manual',
        providerCustomerId: data.providerCustomerId,
        providerReference: data.providerReference,
      },
      include: subscriptionInclude,
    });
  }

  private assertCanAccessUserSubscription(userUuid: string, requester?: RequestUser) {
    if (!requester || requester.role === Role.ADMINISTRATOR || requester.sub === userUuid) {
      return;
    }

    throw new ForbiddenException('You can only access your own subscription.');
  }
}
