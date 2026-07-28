import { ApiError, type Paginated, type PeerCard } from "../types";
import { publicYouthPeers, requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";
import type { MockUser } from "./fixtures";

function toPeerCard(peer: MockUser, isConnected: boolean): PeerCard {
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
    isConnected,
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

    const connected = new Set(db.connections[user.uuid] ?? []);
    let peers = publicYouthPeers(db, user.uuid);
    if (search) {
      peers = peers.filter((peer) => `${peer.firstName} ${peer.lastName}`.toLowerCase().includes(search));
    }

    const total = peers.length;
    const items = peers
      .slice((page - 1) * limit, (page - 1) * limit + limit)
      .map((peer) => toPeerCard(peer, connected.has(peer.uuid)));

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getProfile(uuid: string): Promise<PeerCard> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    const peer = publicYouthPeers(db, user.uuid).find((candidate) => candidate.uuid === uuid);
    if (!peer) throw new ApiError("This profile is not available.", 404);

    const connected = new Set(db.connections[user.uuid] ?? []);
    return toPeerCard(peer, connected.has(peer.uuid));
  },

  async listMine(): Promise<PeerCard[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const connectedUuids = db.connections[user.uuid] ?? [];

    return connectedUuids
      .map((uuid) => db.users.find((candidate) => candidate.uuid === uuid))
      .filter((candidate): candidate is MockUser => Boolean(candidate))
      .map((peer) => toPeerCard(peer, true));
  },

  async connect(uuid: string): Promise<{ connected: boolean }> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    const target = publicYouthPeers(db, user.uuid).find((candidate) => candidate.uuid === uuid);
    if (!target) throw new ApiError("This person is not available to connect with.", 404);

    const existing = db.connections[user.uuid] ?? [];
    if (!existing.includes(uuid)) {
      db.connections[user.uuid] = [...existing, uuid];
      saveDb(db);
    }
    return { connected: true };
  },

  async disconnect(uuid: string): Promise<{ connected: boolean }> {
    await mockLatency(100, 250);
    const db = getDb();
    const user = requireSession(db);
    db.connections[user.uuid] = (db.connections[user.uuid] ?? []).filter((candidate) => candidate !== uuid);
    saveDb(db);
    return { connected: false };
  },
};
