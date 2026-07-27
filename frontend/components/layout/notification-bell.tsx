"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { notifications, type AppNotification } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/lib/i18n/context";

export function NotificationBell() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { unreadCount: count } = await notifications.unreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore - the bell simply shows no badge until the next poll
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const openFeed = useCallback(async () => {
    setOpen((prev) => !prev);
    setLoading(true);
    try {
      const feed = await notifications.myFeed({ limit: 8 });
      setItems(feed.items);
      setUnreadCount(feed.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    await notifications.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openFeed}
        aria-label={t("topnav.notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sb-primary)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="sb-fade-in absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] shadow-[var(--sb-shadow-lg)]">
            <div className="flex items-center justify-between border-b border-[var(--sb-border)] px-3.5 py-2.5">
              <p className="text-sm font-semibold">{t("topnav.notifications")}</p>
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)]"
              >
                <CheckCheck size={13} /> {t("topnav.markAllRead")}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="space-y-2 p-3.5">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="p-3.5">
                  <EmptyState icon={Bell} title={t("topnav.noNotifications")} description={t("topnav.noNotificationsDescription")} />
                </div>
              )}
              {!loading &&
                items.map((item) => (
                  <div
                    key={item.uuid}
                    className="border-b border-[var(--sb-border)] px-3.5 py-2.5 last:border-b-0 hover:bg-[var(--sb-bg-panel-hover)]"
                  >
                    <div className="flex items-start gap-2">
                      {!item.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sb-primary)]" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[var(--sb-text)]">{item.subject}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--sb-text-muted)]">{item.body}</p>
                        <p className="mt-1 text-[10px] text-[var(--sb-text-faint)]">{formatRelativeTime(item.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
