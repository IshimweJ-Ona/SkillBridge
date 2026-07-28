import { ApiError } from "../types";
import type { MockDb, MockUser } from "./fixtures";

export function requireSession(db: MockDb): MockUser {
  const user = db.users.find((candidate) => candidate.uuid === db.sessionUuid);
  if (!user) {
    throw new ApiError("Authentication is required.", 401);
  }
  return user;
}

export function toPublicUser(user: MockUser) {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

export function mockTokens() {
  const token = `mock.${crypto.randomUUID()}`;
  return { token, accessToken: token, refreshToken: `mock.${crypto.randomUUID()}` };
}

// Fellow youth eligible to appear to `excludeUuid` on the Connect directory
// and as peer messaging contacts - mirrors the visibility rule in
// backend/src/connections/connections.service.ts and
// backend/src/messaging/messaging.service.ts#computeContacts.
export function publicYouthPeers(db: MockDb, excludeUuid: string): MockUser[] {
  return db.users.filter(
    (candidate) =>
      candidate.uuid !== excludeUuid &&
      candidate.role === "YOUTH_USER" &&
      candidate.status === "ACTIVE" &&
      candidate.profile?.visibility === "PUBLIC",
  );
}
