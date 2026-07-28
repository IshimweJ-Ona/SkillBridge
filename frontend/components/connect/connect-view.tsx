"use client";

import { Search } from "@/lib/icons";
import { useEffect, useState } from "react";
import { UndrawFriendship } from "react-undraw-illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, connections, type PeerCard as PeerCardData } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { PeerCard } from "./peer-card";

export function ConnectView() {
  const t = useTranslations();
  const { show } = useToast();

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PeerCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUuid, setPendingUuid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await connections.directory({ search: search || undefined, limit: 30 });
        if (active) setItems(response.items);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search]);

  const handleToggleConnect = async (peer: PeerCardData) => {
    setPendingUuid(peer.uuid);
    try {
      if (peer.isConnected) {
        await connections.disconnect(peer.uuid);
      } else {
        await connections.connect(peer.uuid);
      }
      setItems((current) =>
        current.map((item) => (item.uuid === peer.uuid ? { ...item, isConnected: !peer.isConnected } : item)),
      );
    } catch (err) {
      show({
        variant: "error",
        title: t("connect.actionFailedTitle"),
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setPendingUuid(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("connect.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("connect.subtitle")}</p>
      </div>

      <Input
        leadingIcon={<Search size={15} />}
        placeholder={t("connect.searchPlaceholder")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          illustration={UndrawFriendship}
          title={t("connect.noPeersTitle")}
          description={t("connect.noPeersDescription")}
        />
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((peer) => (
            <PeerCard
              key={peer.uuid}
              peer={peer}
              connectPending={pendingUuid === peer.uuid}
              onToggleConnect={handleToggleConnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
