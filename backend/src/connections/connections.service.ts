import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionStatus, Prisma, Role, UserStatus, Visibility } from '@prisma/client';
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

export type ConnectionState = 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED';

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
  connectionState: ConnectionState;
};

/** Fellow-youth directory and request/accept connections. Browsing/searching
 * only surfaces PUBLIC-visibility youth profiles, but messaging is gated on
 * an ACCEPTED Connection row, not on visibility alone (see
 * messaging.service.ts#computeContacts). */
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

  /** Every connection row touching this user, keyed by the *other* person's
   * uuid, so a peer card can be shaped regardless of who requested whom. */
  private async connectionsByPeerUuid(userId: number) {
    const rows = await this.prisma.connection.findMany({
      where: { OR: [{ userId }, { connectedUserId: userId }] },
      select: {
        userId: true,
        connectedUserId: true,
        status: true,
        user: { select: { uuid: true } },
        connectedUser: { select: { uuid: true } },
      },
    });

    const byPeerUuid = new Map<string, { status: ConnectionStatus; requestedByMe: boolean }>();
    for (const row of rows) {
      const requestedByMe = row.userId === userId;
      const peerUuid = requestedByMe ? row.connectedUser.uuid : row.user.uuid;
      byPeerUuid.set(peerUuid, { status: row.status, requestedByMe });
    }
    return byPeerUuid;
  }

  private stateFor(
    peerUuid: string,
    connections: Map<string, { status: ConnectionStatus; requestedByMe: boolean }>,
  ): ConnectionState {
    const connection = connections.get(peerUuid);
    if (!connection) return 'NONE';
    if (connection.status === ConnectionStatus.ACCEPTED) return 'ACCEPTED';
    return connection.requestedByMe ? 'PENDING_SENT' : 'PENDING_RECEIVED';
  }

  private shapePeer(peer: Peer, state: ConnectionState): PeerCard {
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
      connectionState: state,
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

    const [peers, total, connections] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: PEER_SELECT,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.connectionsByPeerUuid(me.id),
    ]);

    return {
      items: peers.map((peer) => this.shapePeer(peer, this.stateFor(peer.uuid, connections))),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Accepted connections only - this is the youth's "my network" list. */
  async myConnections(userUuid: string) {
    const me = await this.resolveUser(userUuid);
    const rows = await this.prisma.connection.findMany({
      where: { status: ConnectionStatus.ACCEPTED, OR: [{ userId: me.id }, { connectedUserId: me.id }] },
      orderBy: { respondedAt: 'desc' },
      select: {
        userId: true,
        user: { select: PEER_SELECT },
        connectedUser: { select: PEER_SELECT },
      },
    });

    return rows.map((row) => this.shapePeer(row.userId === me.id ? row.connectedUser : row.user, 'ACCEPTED'));
  }

  /** Pending requests directed at me, waiting on my accept/reject. */
  async pendingRequests(userUuid: string) {
    const me = await this.resolveUser(userUuid);
    const rows = await this.prisma.connection.findMany({
      where: { connectedUserId: me.id, status: ConnectionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: { user: { select: PEER_SELECT } },
    });

    return rows.map((row) => this.shapePeer(row.user, 'PENDING_RECEIVED'));
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

    const connections = await this.connectionsByPeerUuid(me.id);
    return this.shapePeer(target, this.stateFor(target.uuid, connections));
  }

  /** Sends a connect request. If the target already requested *me* (a
   * reverse PENDING row exists), this accepts it instead of creating a
   * second row - if both people click Connect, it's an instant match. */
  async requestConnection(userUuid: string, targetUuid: string) {
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

    const reverse = await this.prisma.connection.findUnique({
      where: { userId_connectedUserId: { userId: target.id, connectedUserId: me.id } },
    });

    if (reverse) {
      if (reverse.status === ConnectionStatus.PENDING) {
        await this.prisma.connection.update({
          where: { id: reverse.id },
          data: { status: ConnectionStatus.ACCEPTED, respondedAt: new Date() },
        });
      }
      return { connectionState: 'ACCEPTED' as const };
    }

    await this.prisma.connection.upsert({
      where: { userId_connectedUserId: { userId: me.id, connectedUserId: target.id } },
      update: {},
      create: { userId: me.id, connectedUserId: target.id },
    });

    return { connectionState: 'PENDING_SENT' as const };
  }

  async acceptRequest(userUuid: string, requesterUuid: string) {
    const me = await this.resolveUser(userUuid);
    const requester = await this.resolveUser(requesterUuid);

    const connection = await this.prisma.connection.findUnique({
      where: { userId_connectedUserId: { userId: requester.id, connectedUserId: me.id } },
    });

    if (!connection || connection.status !== ConnectionStatus.PENDING) {
      throw new NotFoundException('No pending request from this person.');
    }

    await this.prisma.connection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.ACCEPTED, respondedAt: new Date() },
    });

    return { connectionState: 'ACCEPTED' as const };
  }

  /** Rejects a pending request (deletes the row, freeing the pair up for a
   * future request), cancels a request I sent, or removes an existing
   * accepted connection - whichever applies to this (me, peer) pair. */
  async removeConnection(userUuid: string, peerUuid: string) {
    const me = await this.resolveUser(userUuid);
    const peer = await this.resolveUser(peerUuid);

    const connection = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { userId: me.id, connectedUserId: peer.id },
          { userId: peer.id, connectedUserId: me.id },
        ],
      },
    });

    if (!connection) {
      throw new NotFoundException('No connection with this person.');
    }

    await this.prisma.connection.delete({ where: { id: connection.id } });
    return { connectionState: 'NONE' as const };
  }
}
