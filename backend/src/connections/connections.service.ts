import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus, Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PEER_SELECT = {
  uuid: true,
  firstName: true,
  lastName: true,
  profile: {
    select: {
      avatarUrl: true,
      headline: true,
      bio: true,
      skills: true,
      careerInterests: true,
      languages: true,
      location: true,
    },
  },
} satisfies Prisma.UserSelect;

type Peer = Prisma.UserGetPayload<{ select: typeof PEER_SELECT }>;

export type PeerCard = {
  uuid: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  careerInterests: string[];
  languages: string[];
  location: string | null;
  isConnected: boolean;
};

/** Fellow-youth directory: browse, search, save-as-connection, and message
 * peers who've opted into PUBLIC profile visibility. Mirrors the same
 * visibility rule as messaging.service.ts's peer contacts. */
@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveUser(userUuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true, uuid: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async connectedUuids(userId: number): Promise<Set<string>> {
    const rows = await this.prisma.connection.findMany({
      where: { userId },
      select: { connectedUser: { select: { uuid: true } } },
    });
    return new Set(rows.map((row) => row.connectedUser.uuid));
  }

  private shapePeer(peer: Peer, connected: Set<string>, forceConnected = false): PeerCard {
    return {
      uuid: peer.uuid,
      firstName: peer.firstName,
      lastName: peer.lastName,
      avatarUrl: peer.profile?.avatarUrl ?? null,
      headline: peer.profile?.headline ?? null,
      bio: peer.profile?.bio ?? null,
      skills: peer.profile?.skills ?? [],
      careerInterests: peer.profile?.careerInterests ?? [],
      languages: peer.profile?.languages ?? [],
      location: peer.profile?.location ?? null,
      isConnected: forceConnected || connected.has(peer.uuid),
    };
  }

  async directory(userUuid: string, search: string | undefined, page: number, limit: number) {
    const me = await this.resolveUser(userUuid);

    const where: Prisma.UserWhereInput = {
      id: { not: me.id },
      role: Role.YOUTH_USER,
      status: UserStatus.ACTIVE,
      profile: { visibility: Visibility.PUBLIC },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [peers, total, connected] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: PEER_SELECT,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.connectedUuids(me.id),
    ]);

    return {
      items: peers.map((peer) => this.shapePeer(peer, connected)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async myConnections(userUuid: string) {
    const me = await this.resolveUser(userUuid);
    const rows = await this.prisma.connection.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { connectedUser: { select: PEER_SELECT } },
    });

    return rows.map((row) => this.shapePeer(row.connectedUser, new Set(), true));
  }

  async getProfile(userUuid: string, targetUuid: string) {
    const me = await this.resolveUser(userUuid);
    const target = await this.prisma.user.findFirst({
      where: {
        uuid: targetUuid,
        role: Role.YOUTH_USER,
        profile: { visibility: Visibility.PUBLIC },
      },
      select: PEER_SELECT,
    });

    if (!target) {
      throw new NotFoundException('This profile is not available.');
    }

    const connected = await this.connectedUuids(me.id);
    return this.shapePeer(target, connected);
  }

  async connect(userUuid: string, targetUuid: string) {
    if (userUuid === targetUuid) {
      throw new BadRequestException('You cannot connect with yourself.');
    }

    const me = await this.resolveUser(userUuid);
    const target = await this.prisma.user.findFirst({
      where: {
        uuid: targetUuid,
        role: Role.YOUTH_USER,
        profile: { visibility: Visibility.PUBLIC },
      },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('This person is not available to connect with.');
    }

    await this.prisma.connection.upsert({
      where: { userId_connectedUserId: { userId: me.id, connectedUserId: target.id } },
      update: {},
      create: { userId: me.id, connectedUserId: target.id },
    });

    return { connected: true };
  }

  async disconnect(userUuid: string, targetUuid: string) {
    const me = await this.resolveUser(userUuid);
    const target = await this.resolveUser(targetUuid);

    await this.prisma.connection.deleteMany({
      where: { userId: me.id, connectedUserId: target.id },
    });

    return { connected: false };
  }
}
