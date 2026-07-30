"use client";

import { Search } from "@/lib/icons";
import { useCallback, useEffect, useState } from "react";
import { UndrawFriendship } from "react-undraw-illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, connections, type PeerCard as PeerCardData } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { PeerCard } from "./peer-card";

type Tab = "directory" | "requests";

export function ConnectView() {
  const t = useTranslations();
  const { show } = useToast();

  const [tab, setTab] = useState<Tab>("directory");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PeerCardData[]>([]);
  const [requests, setRequests] = useState<PeerCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUuid, setPendingUuid] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const items = await connections.pendingRequests();
      setRequests(items);
    } catch {
      // transient failure - keep whatever was already on screen
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (tab !== "directory") return;
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
  }, [search, tab]);

  const runAction = async (peer: PeerCardData, action: () => Promise<{ connectionState: PeerCardData["connectionState"] }>) => {
    setPendingUuid(peer.uuid);
    try {
      const result = await action();
      setItems((current) =>
        current.map((item) => (item.uuid === peer.uuid ? { ...item, connectionState: result.connectionState } : item)),
      );
      setRequests((current) => current.filter((item) => item.uuid !== peer.uuid));
      if (result.connectionState === "ACCEPTED") loadRequests();
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

  const handleRequestConnection = (peer: PeerCardData) => runAction(peer, () => connections.requestConnection(peer.uuid));
  const handleAcceptRequest = (peer: PeerCardData) => runAction(peer, () => connections.acceptRequest(peer.uuid));
  const handleRemoveConnection = (peer: PeerCardData) => runAction(peer, () => connections.removeConnection(peer.uuid));

  const visibleItems = tab === "directory" ? items : requests;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("connect.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("connect.subtitle")}</p>
      </div>

      <div className="flex gap-1 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-1">
        {(["directory", "requests"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-[var(--sb-radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors",
              tab === value
                ? "bg-[var(--sb-bg-panel)] text-[var(--sb-text)] shadow-[var(--sb-shadow-sm)]"
                : "text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]",
            )}
          >
            {value === "directory" ? t("connect.directoryTab") : t("connect.requestsTab")}
            {value === "requests" && requests.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--sb-primary)] px-1.5 py-0.5 text-[10px] text-white">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "directory" && (
        <Input
          leadingIcon={<Search size={15} />}
          placeholder={t("connect.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}

      {tab === "directory" && loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      )}

      {(tab === "requests" || !loading) && visibleItems.length === 0 && (
        <EmptyState
          illustration={UndrawFriendship}
          title={tab === "directory" ? t("connect.noPeersTitle") : t("connect.noRequestsTitle")}
          description={tab === "directory" ? t("connect.noPeersDescription") : t("connect.noRequestsDescription")}
        />
      )}

      {(tab === "requests" || !loading) && visibleItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((peer) => (
            <PeerCard
              key={peer.uuid}
              peer={peer}
              pending={pendingUuid === peer.uuid}
              onRequestConnection={handleRequestConnection}
              onAcceptRequest={handleAcceptRequest}
              onRemoveConnection={handleRemoveConnection}
            />
          ))}
        </div>
      )}
    </div>
  );
}
