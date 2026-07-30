import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { ChatMessage, MessageableContact, MessageThread } from "../types";

const base = API_BASES.messaging;

export const messagesApi = {
  listThreads: () => apiFetch<MessageThread[]>(base, "/threads"),

  listMessages: (threadUuid: string) =>
    apiFetch<ChatMessage[]>(base, `/threads/${threadUuid}/messages`),

  sendMessage: (threadUuid: string, body: string) =>
    apiFetch<ChatMessage>(base, `/threads/${threadUuid}/messages`, {
      method: "POST",
      body: { body },
    }),

  startThread: (recipientUuid: string, body: string) =>
    apiFetch<MessageThread>(base, "/threads", {
      method: "POST",
      body: { recipientUuid, body },
    }),

  markThreadRead: (threadUuid: string) =>
    apiFetch<{ updated: number }>(base, `/threads/${threadUuid}/read`, {
      method: "PATCH",
      body: {},
    }),

  listContacts: () => apiFetch<MessageableContact[]>(base, "/threads/contacts"),
};
