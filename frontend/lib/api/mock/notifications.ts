import { ApiError, type NotificationsFeed } from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

export const notificationsApiMock = {
  async myFeed(query?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<NotificationsFeed> {
    await mockLatency(150, 350);
    const db = getDb();
    const user = requireSession(db);
    let items = db.notifications
      .filter((n) => n.userUuid === user.uuid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = items.filter((n) => !n.readAt).length;

    if (query?.unreadOnly) items = items.filter((n) => !n.readAt);

    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 20;

    return { items: items.slice(offset, offset + limit), total: items.length, unreadCount };
  },

  async unreadCount(): Promise<{ unreadCount: number }> {
    await mockLatency(80, 200);
    const db = getDb();
    const user = requireSession(db);
    const unreadCount = db.notifications.filter((n) => n.userUuid === user.uuid && !n.readAt).length;
    return { unreadCount };
  },

  async markRead(uuid: string): Promise<{ uuid: string; readAt: string }> {
    await mockLatency(80, 200);
    const db = getDb();
    const notification = db.notifications.find((n) => n.uuid === uuid);
    if (!notification) throw new ApiError("Notification not found.", 404);
    notification.readAt = notification.readAt ?? new Date().toISOString();
    saveDb(db);
    return { uuid, readAt: notification.readAt };
  },

  async markAllRead(): Promise<{ updated: number }> {
    await mockLatency(120, 260);
    const db = getDb();
    const user = requireSession(db);
    let updated = 0;
    const now = new Date().toISOString();
    for (const notification of db.notifications) {
      if (notification.userUuid === user.uuid && !notification.readAt) {
        notification.readAt = now;
        updated += 1;
      }
    }
    saveDb(db);
    return { updated };
  },
};
