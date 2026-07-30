import { ApiError, type Paginated, type PeerCard, type ConnectionState } from "../types";
import { publicYouthPeers, requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";
import type { MockDb, MockUser } from "./fixtures";

function connectionState(db: MockDb, myUuid: string, peerUuid: string): ConnectionState {
  const row = db.connections.find(
    (candidate) =>
      (candidate.requesterUuid === myUuid && candidate.recipientUuid === peerUuid) ||
      (candidate.requesterUuid === peerUuid && candidate.recipientUuid === myUuid),
  );
  if (!row) return "NONE";
  if (row.status === "ACCEPTED") return "ACCEPTED";
  return row.requesterUuid === myUuid ? "PENDING_SENT" : "PENDING_RECEIVED";
}

function toPeerCard(peer: MockUser, state: ConnectionState): PeerCard {
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

export const connectionsApiMock = {
  async directory(params: { search?: string; page?: number; limit?: number } = {}): Promise<Paginated<PeerCard>> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const search = params.search?.trim().toLowerCase();

    let peers = publicYouthPeers(db, user.uuid);
    if (search) {
      peers = peers.filter((peer) => `${peer.firstName} ${peer.lastName}`.toLowerCase().includes(search));
    }

    const total = peers.length;
    const items = peers
      .slice((page - 1) * limit, (page - 1) * limit + limit)
      .map((peer) => toPeerCard(peer, connectionState(db, user.uuid, peer.uuid)));

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getProfile(uuid: string): Promise<PeerCard> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    const peer = publicYouthPeers(db, user.uuid).find((candidate) => candidate.uuid === uuid);
    if (!peer) throw new ApiError("This profile is not available.", 404);

    return toPeerCard(peer, connectionState(db, user.uuid, peer.uuid));
  },

  async listMine(): Promise<PeerCard[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);

    return db.connections
      .filter((row) => row.status === "ACCEPTED" && (row.requesterUuid === user.uuid || row.recipientUuid === user.uuid))
      .map((row) => {
        const peerUuid = row.requesterUuid === user.uuid ? row.recipientUuid : row.requesterUuid;
        return db.users.find((candidate) => candidate.uuid === peerUuid);
      })
      .filter((peer): peer is MockUser => Boolean(peer))
      .map((peer) => toPeerCard(peer, "ACCEPTED"));
  },

  async pendingRequests(): Promise<PeerCard[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);

    return db.connections
      .filter((row) => row.status === "PENDING" && row.recipientUuid === user.uuid)
      .map((row) => db.users.find((candidate) => candidate.uuid === row.requesterUuid))
      .filter((peer): peer is MockUser => Boolean(peer))
      .map((peer) => toPeerCard(peer, "PENDING_RECEIVED"));
  },

  async requestConnection(uuid: string): Promise<{ connectionState: ConnectionState }> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    const target = publicYouthPeers(db, user.uuid).find((candidate) => candidate.uuid === uuid);
    if (!target) throw new ApiError("This person is not available to connect with.", 404);

    const reverse = db.connections.find(
      (row) => row.requesterUuid === uuid && row.recipientUuid === user.uuid,
    );
    if (reverse) {
      if (reverse.status === "PENDING") reverse.status = "ACCEPTED";
      saveDb(db);
      return { connectionState: "ACCEPTED" };
    }

    const existing = db.connections.find(
      (row) => row.requesterUuid === user.uuid && row.recipientUuid === uuid,
    );
    if (!existing) {
      db.connections.push({ requesterUuid: user.uuid, recipientUuid: uuid, status: "PENDING" });
      saveDb(db);
    }
    return { connectionState: "PENDING_SENT" };
  },

  async acceptRequest(requesterUuid: string): Promise<{ connectionState: ConnectionState }> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    const row = db.connections.find(
      (candidate) =>
        candidate.requesterUuid === requesterUuid &&
        candidate.recipientUuid === user.uuid &&
        candidate.status === "PENDING",
    );
    if (!row) throw new ApiError("No pending request from this person.", 404);

    row.status = "ACCEPTED";
    saveDb(db);
    return { connectionState: "ACCEPTED" };
  },

  async removeConnection(peerUuid: string): Promise<{ connectionState: ConnectionState }> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    const index = db.connections.findIndex(
      (row) =>
        (row.requesterUuid === user.uuid && row.recipientUuid === peerUuid) ||
        (row.requesterUuid === peerUuid && row.recipientUuid === user.uuid),
    );
    if (index === -1) throw new ApiError("No connection with this person.", 404);

    db.connections.splice(index, 1);
    saveDb(db);
    return { connectionState: "NONE" };
  },
};
