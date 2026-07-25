import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ContractStatus,
  ListingStatus,
  Prisma,
  Role,
  ServiceRequestStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { RequestUser } from '../common/current-user.decorator';
import { EmailService } from '../email/email.service';
import { renderBrandedEmail } from '../email/templates';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// GET /listings and GET /listings/:uuid are @Public() - fully unauthenticated
// endpoints - so `include: { user: true }` on a listing was handing every
// freelancer's bcrypt passwordHash to anyone on the internet. The other spots
// below (myListings, myRequests) are authenticated but still cross-user
// (myRequests' clientUser belongs to a different account than the caller),
// so the same minimal select is used everywhere for consistency.
const listingOwnerSelect = {
  uuid: true,
  firstName: true,
  lastName: true,
  profile: true,
} satisfies Prisma.UserSelect;

const marketplaceContactSelect = {
  uuid: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createListing(userUuid: string, body: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    return this.prisma.freelanceListing.create({
      data: {
        userId: user.id,
        title: this.requiredString(body.title, 'title'),
        description: this.requiredString(body.description, 'description'),
        category: this.requiredString(body.category, 'category'),
        pricingType: this.enumValue(body.pricingType, 'FIXED'),
        priceCents: this.numberValue(body.priceCents, 0),
        currency: this.optionalString(body.currency) ?? 'RWF',
        timelineDays: this.numberValue(body.timelineDays, 7),
        portfolioUrls: this.stringArray(body.portfolioUrls),
        status: this.enumValue(body.status, ListingStatus.ACTIVE),
      },
      include: { user: { select: listingOwnerSelect } },
    });
  }

  /** Listings owned by the requesting freelancer - used by the "My Listings" frontend page. */
  async myListings(userUuid: string) {
    const requesterId = await this.resolveRequesterId(userUuid);

    return this.prisma.freelanceListing.findMany({
      where: { userId: requesterId },
      include: { user: { select: listingOwnerSelect }, reviews: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Client requests submitted against listings the requester owns. */
  async myRequests(userUuid: string) {
    const requesterId = await this.resolveRequesterId(userUuid);

    return this.prisma.serviceRequest.findMany({
      where: { listing: { userId: requesterId } },
      include: { listing: true, clientUser: { select: marketplaceContactSelect }, contract: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Contracts where the requester is either the freelancer or the client. */
  async myContracts(userUuid: string) {
    const requesterId = await this.resolveRequesterId(userUuid);

    return this.prisma.serviceContract.findMany({
      where: { OR: [{ freelancerId: requesterId }, { clientUserId: requesterId }] },
      include: { listing: true, transactions: true, review: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listListings(query: Record<string, string | undefined>) {
    const where: Prisma.FreelanceListingWhereInput = {
      status: query.includeInactive === 'true' ? undefined : ListingStatus.ACTIVE,
      category: query.category,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { category: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.freelanceListing.findMany({
        where,
        include: { user: { select: listingOwnerSelect }, reviews: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.freelanceListing.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findListing(uuid: string) {
    const listing = await this.prisma.freelanceListing.findUnique({
      where: { uuid },
      include: {
        user: { select: listingOwnerSelect },
        reviews: true,
      },
    });

    if (!listing) throw new NotFoundException(`Listing ${uuid} was not found.`);

    return listing;
  }

  async createRequest(listingUuid: string, userUuid: string, body: Record<string, unknown>) {
    const listing = await this.prisma.freelanceListing.findUnique({
      where: { uuid: listingUuid },
      include: { user: true },
    });

    if (!listing) throw new NotFoundException(`Listing ${listingUuid} was not found.`);

    // Always attribute the request to the authenticated caller - this route
    // requires auth (@Roles), so there is no anonymous/guest path here.
    // Previously this trusted an arbitrary client-supplied `clientUserUuid`
    // instead of the caller's own identity, letting any caller attribute a
    // request to a different account.
    const clientUserId = await this.resolveRequesterId(userUuid);
    const request = await this.prisma.serviceRequest.create({
      data: {
        listingId: listing.id,
        clientUserId,
        contactName: this.optionalString(body.contactName),
        contactEmail: this.optionalString(body.contactEmail),
        requirements: this.requiredString(body.requirements, 'requirements'),
      },
      include: { listing: true, clientUser: true },
    });

    await this.emailService.send({
      to: listing.user.email ? [listing.user.email] : [],
      subject: 'New SkillBridge marketplace request',
      text: `A client sent a request for ${listing.title}.`,
      html: renderBrandedEmail({
        heading: 'New service request',
        paragraphs: [`A client sent a request for "${listing.title}".`],
        cta: {
          label: 'View request',
          url: `${(process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')}/marketplace/requests`,
        },
      }),
    });

    return request;
  }

  async createContract(
    requestUuid: string,
    user: RequestUser,
    body: Record<string, unknown>,
  ) {
    const [request, freelancer] = await Promise.all([
      this.prisma.serviceRequest.findUnique({
        where: { uuid: requestUuid },
        include: { listing: true, clientUser: true },
      }),
      this.prisma.user.findUnique({ where: { uuid: user.sub }, select: { id: true } }),
    ]);

    if (!request) throw new NotFoundException(`Service request ${requestUuid} was not found.`);
    if (!freelancer) throw new NotFoundException(`User ${user.sub} was not found.`);

    if (user.role !== Role.ADMINISTRATOR && request.listing.userId !== freelancer.id) {
      throw new ForbiddenException('Only the listing owner can accept this request and create a contract.');
    }

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceContract.create({
        data: {
          listingId: request.listingId,
          requestId: request.id,
          freelancerId: freelancer.id,
          clientUserId: request.clientUserId,
          terms: this.requiredString(body.terms, 'terms'),
          deliverables: this.requiredString(body.deliverables, 'deliverables'),
          timelineDays: this.numberValue(body.timelineDays, request.listing.timelineDays),
          feeCents: this.numberValue(body.feeCents, request.listing.priceCents),
          currency: request.listing.currency,
          status: ContractStatus.ACTIVE,
          acceptedAt: new Date(),
        },
      });
      await tx.serviceRequest.update({
        where: { id: request.id },
        data: { status: ServiceRequestStatus.CONTRACTED },
      });
      await tx.transaction.create({
        data: {
          contractId: created.id,
          userId: request.clientUserId,
          type: TransactionType.FREELANCE_ESCROW,
          status: TransactionStatus.PENDING,
          amountCents: created.feeCents,
          currency: created.currency,
          provider: 'mtn-momo',
          metadata: { escrow: true },
        },
      });

      return created;
    });

    return this.prisma.serviceContract.findUnique({
      where: { id: contract.id },
      include: { listing: true, request: true, transactions: true },
    });
  }

  async updateContractStatus(uuid: string, user: RequestUser, body: Record<string, unknown>) {
    const status = this.enumValue(body.status, ContractStatus.ACTIVE) as ContractStatus;

    if (user.role !== Role.ADMINISTRATOR) {
      const existing = await this.prisma.serviceContract.findUnique({
        where: { uuid },
        select: { freelancerId: true, clientUserId: true },
      });
      if (!existing) throw new NotFoundException(`Contract ${uuid} was not found.`);

      const requester = await this.prisma.user.findUnique({
        where: { uuid: user.sub },
        select: { id: true },
      });
      if (!requester) throw new UnauthorizedException('Authentication is required.');

      const isParty =
        existing.freelancerId === requester.id || existing.clientUserId === requester.id;
      if (!isParty) {
        throw new ForbiddenException('You are not a party to this contract.');
      }
    }

    return this.prisma.serviceContract.update({
      where: { uuid },
      data: {
        status,
        deliveredAt: status === ContractStatus.DELIVERED ? new Date() : undefined,
        completedAt: status === ContractStatus.COMPLETED ? new Date() : undefined,
      },
      include: { listing: true, transactions: true },
    });
  }

  async releasePayment(contractUuid: string) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.serviceContract.findUnique({
        where: { uuid: contractUuid },
        include: { transactions: true },
      });

      if (!contract) throw new NotFoundException(`Contract ${contractUuid} was not found.`);

      if (contract.status === ContractStatus.COMPLETED) {
        throw new BadRequestException('Escrow payment for this contract has already been released.');
      }

      await tx.serviceContract.update({
        where: { id: contract.id },
        data: { status: ContractStatus.COMPLETED, completedAt: new Date() },
      });

      await tx.transaction.updateMany({
        where: {
          contractId: contract.id,
          type: TransactionType.FREELANCE_ESCROW,
          status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
        },
        data: {
          status: TransactionStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      return tx.serviceContract.findUnique({
        where: { id: contract.id },
        include: { listing: true, transactions: true },
      });
    });
  }

  async createReview(contractUuid: string, reviewerUuid: string, body: Record<string, unknown>) {
    const [contract, reviewer] = await Promise.all([
      this.prisma.serviceContract.findUnique({ where: { uuid: contractUuid } }),
      this.prisma.user.findUnique({ where: { uuid: reviewerUuid }, select: { id: true } }),
    ]);

    if (!contract) throw new NotFoundException(`Contract ${contractUuid} was not found.`);

    return this.prisma.freelanceReview.create({
      data: {
        contractId: contract.id,
        listingId: contract.listingId,
        reviewerUserId: reviewer?.id,
        rating: Math.max(1, Math.min(5, this.numberValue(body.rating, 5))),
        comment: this.optionalString(body.comment),
        response: this.optionalString(body.response),
      },
      include: { listing: true, contract: true },
    });
  }

  async raiseDispute(transactionUuid: string, userUuid: string, body: Record<string, unknown>) {
    const [transaction, user] = await Promise.all([
      this.prisma.transaction.findUnique({
        where: { uuid: transactionUuid },
        include: { contract: { include: { listing: true } } },
      }),
      this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true } }),
    ]);

    if (!transaction) throw new NotFoundException(`Transaction ${transactionUuid} was not found.`);
    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    const dispute = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          transactionId: transaction.id,
          contractId: transaction.contractId,
          raisedByUserId: user.id,
          reason: this.requiredString(body.reason, 'reason'),
        },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.DISPUTED },
      });
      return created;
    });

    const contract = transaction.contract;
    if (contract) {
      const counterpartyId =
        user.id === contract.freelancerId ? contract.clientUserId : contract.freelancerId;
      if (counterpartyId) {
        await this.notificationsService.notifyDisputeRaised(
          counterpartyId,
          contract.listing.title,
        );
      }
    }

    return dispute;
  }

  async earnings(userUuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    const contracts = await this.prisma.serviceContract.findMany({
      where: { freelancerId: user.id },
      include: { transactions: true },
    });
    const completed = contracts.flatMap((contract) =>
      contract.transactions.filter((tx) => tx.status === TransactionStatus.COMPLETED),
    );
    const pending = contracts.flatMap((contract) =>
      contract.transactions.filter((tx) => tx.status === TransactionStatus.PENDING),
    );

    return {
      totalIncomeCents: completed.reduce((sum, tx) => sum + tx.amountCents, 0),
      pendingEscrowCents: pending.reduce((sum, tx) => sum + tx.amountCents, 0),
      contractCount: contracts.length,
      transactions: contracts.flatMap((contract) => contract.transactions),
    };
  }

  private async resolveRequesterId(userUuid: string): Promise<number> {
    const requester = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!requester) throw new UnauthorizedException('Authentication is required.');

    return requester.id;
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

  private numberValue(value: unknown, fallback: number) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? number : fallback;
  }

  private enumValue<T extends string>(value: unknown, fallback: T) {
    return typeof value === 'string' && value ? (value as T) : fallback;
  }
}
