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

function participantsFor(db: MockDb, youthUuid: string, employerUuid: string): MessageThread["participants"] {
  const youth = db.users.find((candidate) => candidate.uuid === youthUuid);
  const employer = db.users.find((candidate) => candidate.uuid === employerUuid);
  const employerCompanyUuid = Object.entries(db.companyOwners).find(([, ownerUuid]) => ownerUuid === employerUuid)?.[0];
  const company = employerCompanyUuid ? db.companies.find((c) => c.uuid === employerCompanyUuid) : undefined;

  return [
    youth
      ? { uuid: youth.uuid, firstName: youth.firstName, lastName: youth.lastName, role: youth.role }
      : { uuid: youthUuid, firstName: "Unknown", lastName: "User", role: "YOUTH_USER" as const },
    employer
      ? {
          uuid: employer.uuid,
          firstName: employer.firstName,
          lastName: employer.lastName,
          role: employer.role,
          companyName: company?.name ?? null,
        }
      : { uuid: employerUuid, firstName: "Unknown", lastName: "User", role: "EMPLOYER" as const },
  ];
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
      throw new ApiError("You can only message someone you have an active application with.", 403);
    }

    const existing = db.messageThreads.find(
      (thread) =>
        thread.participants.some((p) => p.uuid === user.uuid) &&
        thread.participants.some((p) => p.uuid === recipientUuid),
    );

    const youthUuid = user.role === "EMPLOYER" ? recipientUuid : user.uuid;
    const employerUuid = user.role === "EMPLOYER" ? user.uuid : recipientUuid;

    const thread: MessageThread =
      existing ?? {
        uuid: crypto.randomUUID(),
        participants: participantsFor(db, youthUuid, employerUuid),
        lastMessage: null,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
        context: { jobTitle: contact.context },
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
