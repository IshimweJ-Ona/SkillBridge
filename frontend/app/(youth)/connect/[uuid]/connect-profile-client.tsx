"use client";

import { Check, Loader2, MapPin, MessageSquare, UserCheck, UserPlus, UserX } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ApiError, connections, type PeerCard } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

function SkillGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--sb-text-faint)]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-[var(--sb-bg-inset)] px-2.5 py-1 text-[11px] text-[var(--sb-text-muted)] ring-1 ring-inset ring-[var(--sb-border)]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ConnectProfileClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const t = useTranslations();
  const { show } = useToast();

  const [peer, setPeer] = useState<PeerCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await connections.getProfile(uuid);
        if (active) setPeer(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [uuid]);

  const runAction = async (action: () => Promise<{ connectionState: PeerCard["connectionState"] }>) => {
    if (!peer) return;
    setActionPending(true);
    try {
      const result = await action();
      setPeer({ ...peer, connectionState: result.connectionState });
    } catch (err) {
      show({
        variant: "error",
        title: t("connect.actionFailedTitle"),
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (notFound || !peer) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--sb-text-muted)]">{t("connect.notFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/connect")}>
          {t("connect.backToConnect")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]"
      >
        &larr; {t("connect.backToConnect")}
      </button>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar firstName={peer.firstName} lastName={peer.lastName} imageUrl={peer.avatarUrl} size={64} clickable />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-[var(--sb-text)]">
              {peer.firstName} {peer.lastName}
            </h1>
            {peer.headline && <p className="text-sm text-[var(--sb-text-muted)]">{peer.headline}</p>}
            {peer.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--sb-text-faint)]">
                <MapPin size={12} /> {peer.location}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {peer.connectionState === "NONE" && (
            <Button type="button" loading={actionPending} onClick={() => runAction(() => connections.requestConnection(peer.uuid))}>
              <UserPlus size={15} /> {t("connect.connectAction")}
            </Button>
          )}
          {peer.connectionState === "PENDING_SENT" && (
            <Button
              type="button"
              variant="secondary"
              loading={actionPending}
              onClick={() => runAction(() => connections.removeConnection(peer.uuid))}
            >
              <UserX size={15} /> {t("connect.cancelRequestAction")}
            </Button>
          )}
          {peer.connectionState === "PENDING_RECEIVED" && (
            <Button type="button" loading={actionPending} onClick={() => runAction(() => connections.acceptRequest(peer.uuid))}>
              <Check size={15} /> {t("connect.acceptAction")}
            </Button>
          )}
          {peer.connectionState === "ACCEPTED" && (
            <Button
              type="button"
              variant="secondary"
              loading={actionPending}
              onClick={() => runAction(() => connections.removeConnection(peer.uuid))}
            >
              <UserCheck size={15} /> {t("connect.connectedAction")}
            </Button>
          )}
          {peer.connectionState === "ACCEPTED" && (
            <Button type="button" variant="secondary" onClick={() => router.push(`/messages?to=${peer.uuid}`)}>
              <MessageSquare size={15} /> {t("connect.messageAction")}
            </Button>
          )}
        </div>

        {peer.bio && <p className="mt-5 whitespace-pre-line text-sm text-[var(--sb-text-muted)]">{peer.bio}</p>}
      </Card>

      <Card className="space-y-4 p-5">
        <SkillGroup label={t("connect.skillsLabel")} items={peer.skills} />
        <SkillGroup label={t("connect.careerInterestsLabel")} items={peer.careerInterests} />
        <SkillGroup label={t("connect.languagesLabel")} items={peer.languages} />
      </Card>
    </div>
  );
}
