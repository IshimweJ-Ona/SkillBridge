import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingGateway } from './messaging.gateway';

const USER_SELECT = {
  id: true,
  uuid: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

type ContactUser = {
  uuid: string;
  firstName: string;
  lastName: string;
  role: Role;
};

type Contact = {
  uuid: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyName: string | null;
  context: string;
};

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  // ──────────────────────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────────────────────

  private async resolveUser(userUuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Conversations always store the pair as (lower id, higher id) so a pair
   * of users maps to exactly one thread regardless of who starts it. */
  private orderPair(idA: number, idB: number): [number, number] {
    return idA < idB ? [idA, idB] : [idB, idA];
  }

  private async findThreadForUser(threadUuid: string, userId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { uuid: threadUuid },
      include: {
        participantOne: { select: USER_SELECT },
        participantTwo: { select: USER_SELECT },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    return conversation;
  }

  /** People the given user can legitimately message: for youth, both (a)
   * the employer at any company they've applied to, and (b) other youth
   * peers who've opted into PUBLIC profile visibility (peer networking -
   * EMPLOYERS_ONLY/PRIVATE profiles are deliberately excluded, since that
   * visibility setting means "don't surface me to fellow youth"). For
   * employers, applicants to their own postings. Never an arbitrary/
   * fabricated contact. */
  private async computeContacts(userId: number, role: Role): Promise<Contact[]> {
    const contacts = new Map<string, Contact>();

    if (role === Role.YOUTH_USER) {
      const applications = await this.prisma.jobApplication.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        select: {
          job: {
            select: {
              title: true,
              company: {
                select: {
                  name: true,
                  owner: { select: USER_SELECT },
                },
              },
            },
          },
        },
      });

      for (const application of applications) {
        const owner = application.job.company.owner;
        if (!owner || contacts.has(owner.uuid)) continue;
        contacts.set(owner.uuid, {
          uuid: owner.uuid,
          firstName: owner.firstName,
          lastName: owner.lastName,
          role: owner.role,
          companyName: application.job.company.name,
          context: `Applied to ${application.job.title}`,
        });
      }

      const peers = await this.prisma.profile.findMany({
        where: {
          visibility: 'PUBLIC',
          user: { id: { not: userId }, status: 'ACTIVE', role: Role.YOUTH_USER },
        },
        select: { user: { select: USER_SELECT } },
        take: 200,
      });

      for (const peer of peers) {
        if (contacts.has(peer.user.uuid)) continue;
        contacts.set(peer.user.uuid, {
          uuid: peer.user.uuid,
          firstName: peer.user.firstName,
          lastName: peer.user.lastName,
          role: peer.user.role,
          companyName: null,
          context: 'Fellow youth on SkillBridge',
        });
      }
    } else if (role === Role.EMPLOYER) {
      const applications = await this.prisma.jobApplication.findMany({
        where: { job: { company: { ownerUserId: userId } } },
        orderBy: { submittedAt: 'desc' },
        select: {
          user: { select: USER_SELECT },
          job: { select: { title: true } },
        },
      });

      for (const application of applications) {
        if (contacts.has(application.user.uuid)) continue;
        contacts.set(application.user.uuid, {
          uuid: application.user.uuid,
          firstName: application.user.firstName,
          lastName: application.user.lastName,
          role: application.user.role,
          companyName: null,
          context: `Applied to ${application.job.title}`,
        });
      }
    }

    return [...contacts.values()];
  }

  private async companyNameFor(ownerId: number): Promise<string | null> {
    const company = await this.prisma.company.findFirst({
      where: { ownerUserId: ownerId },
      select: { name: true },
      orderBy: { createdAt: 'asc' },
    });
    return company?.name ?? null;
  }

  private async shapeParticipant(user: ContactUser & { id: number }): Promise<{
    uuid: string;
    firstName: string;
    lastName: string;
    role: Role;
    companyName?: string | null;
  }> {
    if (user.role !== Role.EMPLOYER) {
      return { uuid: user.uuid, firstName: user.firstName, lastName: user.lastName, role: user.role };
    }
    return {
      uuid: user.uuid,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyName: await this.companyNameFor(user.id),
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  Contacts
  // ──────────────────────────────────────────────────────────────

  async listContacts(userUuid: string) {
    const me = await this.resolveUser(userUuid);
    return this.computeContacts(me.id, me.role);
  }

  // ──────────────────────────────────────────────────────────────
  //  Threads
  // ──────────────────────────────────────────────────────────────

  async listThreads(userUuid: string) {
    const me = await this.resolveUser(userUuid);

    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ participantOneId: me.id }, { participantTwoId: me.id }] },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        participantOne: { select: USER_SELECT },
        participantTwo: { select: USER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { uuid: true, body: true, readAt: true, createdAt: true, sender: { select: { uuid: true } } },
        },
      },
    });

    const unreadByConversation = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderId: { not: me.id },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map(unreadByConversation.map((row) => [row.conversationId, row._count._all]));

    return Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = conversation.messages[0];
        return {
          uuid: conversation.uuid,
          participants: [
            await this.shapeParticipant(conversation.participantOne),
            await this.shapeParticipant(conversation.participantTwo),
          ],
          lastMessage: lastMessage
            ? {
                uuid: lastMessage.uuid,
                threadUuid: conversation.uuid,
                senderUuid: lastMessage.sender.uuid,
                body: lastMessage.body,
                readAt: lastMessage.readAt,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount: unreadMap.get(conversation.id) ?? 0,
          updatedAt: conversation.lastMessageAt ?? conversation.createdAt,
          context: conversation.contextJobTitle ? { jobTitle: conversation.contextJobTitle } : null,
        };
      }),
    );
  }

  async startThread(userUuid: string, recipientUuid: string, body: string) {
    if (userUuid === recipientUuid) {
      throw new BadRequestException('You cannot start a conversation with yourself');
    }

    const me = await this.resolveUser(userUuid);
    const contacts = await this.computeContacts(me.id, me.role);
    const contact = contacts.find((candidate) => candidate.uuid === recipientUuid);
    if (!contact) {
      throw new ForbiddenException('You are not able to message this person.');
    }

    const recipient = await this.resolveUser(recipientUuid);
    const [participantOneId, participantTwoId] = this.orderPair(me.id, recipient.id);
    // Only a real job-application contact has an actual job title to store -
    // a peer contact's context ("Fellow youth on SkillBridge") isn't one.
    const jobTitleMatch = /^Applied to (.+)$/.exec(contact.context);
    const jobTitle = jobTitleMatch?.[1];

    const conversation = await this.prisma.conversation.upsert({
      where: { participantOneId_participantTwoId: { participantOneId, participantTwoId } },
      update: {},
      create: { participantOneId, participantTwoId, contextJobTitle: jobTitle },
      include: {
        participantOne: { select: USER_SELECT },
        participantTwo: { select: USER_SELECT },
      },
    });

    const message = await this.createMessage(conversation, me.id, body);

    return {
      uuid: conversation.uuid,
      participants: [
        await this.shapeParticipant(conversation.participantOne),
        await this.shapeParticipant(conversation.participantTwo),
      ],
      lastMessage: message,
      unreadCount: 0,
      updatedAt: message.createdAt,
      context: conversation.contextJobTitle ? { jobTitle: conversation.contextJobTitle } : null,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  Messages
  // ──────────────────────────────────────────────────────────────

  async listMessages(userUuid: string, threadUuid: string) {
    const me = await this.resolveUser(userUuid);
    const conversation = await this.findThreadForUser(threadUuid, me.id);

    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: {
        uuid: true,
        body: true,
        readAt: true,
        createdAt: true,
        sender: { select: { uuid: true } },
      },
    });

    return messages.map((message) => ({
      uuid: message.uuid,
      threadUuid: conversation.uuid,
      senderUuid: message.sender.uuid,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
    }));
  }

  async sendMessage(userUuid: string, threadUuid: string, body: string) {
    const me = await this.resolveUser(userUuid);
    const conversation = await this.findThreadForUser(threadUuid, me.id);

    return this.createMessage(conversation, me.id, body);
  }

  private async createMessage(
    conversation: {
      id: number;
      uuid: string;
      participantOneId: number;
      participantOne: { uuid: string };
      participantTwoId: number;
      participantTwo: { uuid: string };
    },
    senderId: number,
    body: string,
  ) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: conversation.id, senderId, body },
        select: { uuid: true, body: true, readAt: true, createdAt: true, sender: { select: { uuid: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    const shaped = {
      uuid: message.uuid,
      threadUuid: conversation.uuid,
      senderUuid: message.sender.uuid,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };

    const recipientUuid =
      conversation.participantOneId === senderId
        ? conversation.participantTwo.uuid
        : conversation.participantOne.uuid;

    this.messagingGateway.emitToUser(recipientUuid, 'message:new', shaped);

    return shaped;
  }

  // ──────────────────────────────────────────────────────────────
  //  Read state
  // ──────────────────────────────────────────────────────────────

  async markThreadRead(userUuid: string, threadUuid: string) {
    const me = await this.resolveUser(userUuid);
    const conversation = await this.findThreadForUser(threadUuid, me.id);

    const result = await this.prisma.message.updateMany({
      where: { conversationId: conversation.id, senderId: { not: me.id }, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}
