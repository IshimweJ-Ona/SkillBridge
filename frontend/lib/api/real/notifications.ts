import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { NotificationsFeed } from "../types";

const base = API_BASES.matching;

export const notificationsApi = {
  myFeed: (query?: { limit?: number; offset?: number; unreadOnly?: boolean }) =>
    apiFetch<NotificationsFeed>(base, "/notifications/me", {
      query: { ...query, unreadOnly: query?.unreadOnly ? "true" : undefined },
    }),

  unreadCount: () => apiFetch<{ unreadCount: number }>(base, "/notifications/me/unread-count"),

  markRead: (uuid: string) =>
    apiFetch<{ uuid: string; readAt: string }>(base, `/notifications/me/${uuid}/read`, {
      method: "PATCH",
      body: {},
    }),

  markAllRead: () =>
    apiFetch<{ updated: number }>(base, "/notifications/me/read-all", { method: "PATCH", body: {} }),
};
