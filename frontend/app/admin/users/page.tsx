"use client";

import { Search, Users as UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ApiError, users, type AdminUser, type UserStatus } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<UserStatus, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING_VERIFICATION: "warning",
  SUSPENDED: "danger",
  DISABLED: "neutral",
};

export default function AdminUsersPage() {
  const { show } = useToast();
  const t = useTranslations();
  const [items, setItems] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () => users.list({ search: search || undefined, limit: 50 }).then((result) => setItems(result.items));

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleStatusChange = async (user: AdminUser, status: UserStatus) => {
    setUpdating(user.uuid);
    try {
      await users.updateStatus(user.uuid, status);
      setItems((current) => current?.map((item) => (item.uuid === user.uuid ? { ...item, status } : item)) ?? null);
      show({
        variant: "success",
        title: t("admin.users.statusChanged", { name: `${user.firstName} ${user.lastName}`, status: status.toLowerCase() }),
      });
    } catch (err) {
      show({ variant: "error", title: t("admin.users.statusUpdateError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.users.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("admin.users.subtitle")}</p>
      </div>

      <Input leadingIcon={<Search size={15} />} placeholder={t("admin.users.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="space-y-2">
        {items === null && Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}
        {items !== null && items.length === 0 && (
          <EmptyState icon={UsersIcon} title={t("admin.users.noUsersTitle")} description={t("admin.users.noUsersDescription")} />
        )}
        {items !== null &&
          items.map((user) => (
            <Card key={user.uuid} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3">
                <Avatar firstName={user.firstName} lastName={user.lastName} size={34} />
                <div>
                  <p className="text-sm font-medium text-[var(--sb-text)]">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-[var(--sb-text-muted)]">{user.email ?? user.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill tone="neutral">{user.role.replace("_", " ")}</StatusPill>
                <StatusPill tone={STATUS_TONE[user.status]}>{user.status.replace("_", " ")}</StatusPill>
                <span className="hidden text-[10px] text-[var(--sb-text-faint)] sm:inline">
                  {t("admin.users.joined")} {formatDate(user.createdAt)}
                </span>
                <select
                  value={user.status}
                  disabled={updating === user.uuid}
                  onChange={(event) => handleStatusChange(user, event.target.value as UserStatus)}
                  className="h-8 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-2 text-xs text-[var(--sb-text)] focus:border-[var(--sb-primary)] focus:outline-none"
                >
                  <option value="ACTIVE">{t("admin.users.statusActive")}</option>
                  <option value="SUSPENDED">{t("admin.users.statusSuspended")}</option>
                  <option value="DISABLED">{t("admin.users.statusDisabled")}</option>
                </select>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
