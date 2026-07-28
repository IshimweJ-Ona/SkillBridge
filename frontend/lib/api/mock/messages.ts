import { ApiError, type ChatMessage, type MessageableContact, type MessageThread } from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";
import type { MockDb } from "./fixtures";

// Messaging has no seeded/fake conversations (see fixtures.ts) - every
// thread and message here was actually created by a signed-in user
// messaging a real counterpart from listContacts(), which is itself derived
// only from real job-application relationships already in the mock db.

function buildThreadSummary(db: MockDb, thread: MessageThread, viewerUuid: string): MessageThread {
  const threadMessages = db.chatMessages
    .filter((message) => message.threadUuid === thread.uuid)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const lastMessage = threadMessages[threadMessages.length - 1] ?? null;
  const unreadCount = threadMessages.filter((message) => message.senderUuid !== viewerUuid && !message.readAt).length;

  return {
    ...thread,
    lastMessage,
    unreadCount,
    updatedAt: lastMessage?.createdAt ?? thread.updatedAt,
  };
}

// Generic - a thread's two participants no longer have fixed "youth" and
// "employer" slots, now that youth can also message other youth peers.
function participantFor(db: MockDb, uuid: string): MessageThread["participants"][number] {
  const found = db.users.find((candidate) => candidate.uuid === uuid);
  if (!found) return { uuid, firstName: "Unknown", lastName: "User", role: "YOUTH_USER" as const };

  if (found.role !== "EMPLOYER") {
    return { uuid: found.uuid, firstName: found.firstName, lastName: found.lastName, role: found.role };
  }

  const companyUuid = Object.entries(db.companyOwners).find(([, ownerUuid]) => ownerUuid === uuid)?.[0];
  const company = companyUuid ? db.companies.find((c) => c.uuid === companyUuid) : undefined;
  return {
    uuid: found.uuid,
    firstName: found.firstName,
    lastName: found.lastName,
    role: found.role,
    companyName: company?.name ?? null,
  };
}

function participantsFor(db: MockDb, uuidA: string, uuidB: string): MessageThread["participants"] {
  return [participantFor(db, uuidA), participantFor(db, uuidB)];
}

export const messagesApiMock = {
  async listThreads(): Promise<MessageThread[]> {
    await mockLatency(150, 350);
    const db = getDb();
    const user = requireSession(db);

    return db.messageThreads
      .filter((thread) => thread.participants.some((p) => p.uuid === user.uuid))
      .map((thread) => buildThreadSummary(db, thread, user.uuid))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async listMessages(threadUuid: string): Promise<ChatMessage[]> {
    await mockLatency(120, 280);
    const db = getDb();
    const user = requireSession(db);
    const thread = db.messageThreads.find((t) => t.uuid === threadUuid);
    if (!thread || !thread.participants.some((p) => p.uuid === user.uuid)) {
      throw new ApiError("Conversation not found.", 404);
    }

    return db.chatMessages
      .filter((message) => message.threadUuid === threadUuid)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async sendMessage(threadUuid: string, body: string): Promise<ChatMessage> {
    await mockLatency(150, 320);
    const trimmed = body.trim();
    if (!trimmed) throw new ApiError("Message cannot be empty.", 422);

    const db = getDb();
    const user = requireSession(db);
    const thread = db.messageThreads.find((t) => t.uuid === threadUuid);
    if (!thread || !thread.participants.some((p) => p.uuid === user.uuid)) {
      throw new ApiError("Conversation not found.", 404);
    }

    const message: ChatMessage = {
      uuid: crypto.randomUUID(),
      threadUuid,
      senderUuid: user.uuid,
      body: trimmed,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    db.chatMessages.push(message);
    thread.updatedAt = message.createdAt;
    saveDb(db);
    return message;
  },

  async startThread(recipientUuid: string, body: string): Promise<MessageThread> {
    await mockLatency(180, 360);
    const trimmed = body.trim();
    if (!trimmed) throw new ApiError("Message cannot be empty.", 422);

    const db = getDb();
    const user = requireSession(db);

    const contacts = await computeContacts(db, user.uuid, user.role);
    const contact = contacts.find((c) => c.uuid === recipientUuid);
    if (!contact) {
      throw new ApiError("You are not able to message this person.", 403);
    }

    const existing = db.messageThreads.find(
      (thread) =>
        thread.participants.some((p) => p.uuid === user.uuid) &&
        thread.participants.some((p) => p.uuid === recipientUuid),
    );

    // Only a real job-application contact has an actual job title to store -
    // a peer contact's context ("Fellow youth on SkillBridge") isn't one.
    const jobTitleMatch = /^Applied to (.+)$/.exec(contact.context);
    const jobTitle = jobTitleMatch?.[1];

    const thread: MessageThread =
      existing ?? {
        uuid: crypto.randomUUID(),
        participants: participantsFor(db, user.uuid, recipientUuid),
        lastMessage: null,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
        context: jobTitle ? { jobTitle } : null,
      };

    if (!existing) db.messageThreads.push(thread);

    const message: ChatMessage = {
      uuid: crypto.randomUUID(),
      threadUuid: thread.uuid,
      senderUuid: user.uuid,
      body: trimmed,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    db.chatMessages.push(message);
    saveDb(db);

    return buildThreadSummary(db, thread, user.uuid);
  },

  async markThreadRead(threadUuid: string): Promise<{ updated: number }> {
    await mockLatency(80, 200);
    const db = getDb();
    const user = requireSession(db);
    const thread = db.messageThreads.find((t) => t.uuid === threadUuid);
    if (!thread || !thread.participants.some((p) => p.uuid === user.uuid)) {
      throw new ApiError("Conversation not found.", 404);
    }

    let updated = 0;
    const now = new Date().toISOString();
    for (const message of db.chatMessages) {
      if (message.threadUuid === threadUuid && message.senderUuid !== user.uuid && !message.readAt) {
        message.readAt = now;
        updated += 1;
      }
    }
    saveDb(db);
    return { updated };
  },

  async listContacts(): Promise<MessageableContact[]> {
    await mockLatency(150, 300);
    const db = getDb();
    const user = requireSession(db);
    return computeContacts(db, user.uuid, user.role);
  },
};

async function computeContacts(db: MockDb, userUuid: string, role: string): Promise<MessageableContact[]> {
  const byUuid = new Map<string, MessageableContact>();

  if (role === "YOUTH_USER") {
    for (const application of db.applications.filter((app) => app.userUuid === userUuid)) {
      const companyUuid = application.job.company.uuid;
      const employerUuid = db.companyOwners[companyUuid];
      const employer = employerUuid ? db.users.find((candidate) => candidate.uuid === employerUuid) : undefined;
      if (!employer) continue;
      byUuid.set(employer.uuid, {
        uuid: employer.uuid,
        firstName: employer.firstName,
        lastName: employer.lastName,
        role: employer.role,
        companyName: application.job.company.name,
        context: `Applied to ${application.job.title}`,
      });
    }

    // Peer networking: other youth who've opted into PUBLIC profile
    // visibility (EMPLOYERS_ONLY/PRIVATE means "don't surface me to fellow
    // youth") - mirrors messaging.service.ts#computeContacts on the backend.
    for (const candidate of db.users) {
      if (candidate.uuid === userUuid) continue;
      if (candidate.role !== "YOUTH_USER" || candidate.status !== "ACTIVE") continue;
      if (candidate.profile?.visibility !== "PUBLIC") continue;
      if (byUuid.has(candidate.uuid)) continue;
      byUuid.set(candidate.uuid, {
        uuid: candidate.uuid,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        role: candidate.role,
        companyName: null,
        context: "Fellow youth on SkillBridge",
      });
    }
  } else if (role === "EMPLOYER") {
    const ownedCompanyUuids = Object.entries(db.companyOwners)
      .filter(([, ownerUuid]) => ownerUuid === userUuid)
      .map(([companyUuid]) => companyUuid);

    for (const application of db.applications.filter((app) => ownedCompanyUuids.includes(app.job.company.uuid))) {
      const applicant = application.user ?? db.users.find((candidate) => candidate.uuid === application.userUuid);
      if (!applicant) continue;
      byUuid.set(applicant.uuid, {
        uuid: applicant.uuid,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        role: "YOUTH_USER",
        companyName: null,
        context: `Applied to ${application.job.title}`,
      });
    }
  }

  return [...byUuid.values()];
}
