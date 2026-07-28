"use client";

import { MessageSquare, UserCheck, UserPlus } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PeerCard as PeerCardData } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export function PeerCard({
  peer,
  connectPending,
  onToggleConnect,
}: {
  peer: PeerCardData;
  connectPending: boolean;
  onToggleConnect: (peer: PeerCardData) => void;
}) {
  const router = useRouter();
  const t = useTranslations();
  const visibleSkills = peer.skills.slice(0, 3);
  const extraSkillCount = peer.skills.length - visibleSkills.length;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <button
        type="button"
        onClick={() => router.push(`/connect/${peer.uuid}`)}
        className="flex items-start gap-3 text-left"
      >
        <Avatar firstName={peer.firstName} lastName={peer.lastName} imageUrl={peer.avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--sb-text)]">
            {peer.firstName} {peer.lastName}
          </p>
          {peer.headline && <p className="truncate text-xs text-[var(--sb-text-muted)]">{peer.headline}</p>}
          {peer.location && <p className="truncate text-[11px] text-[var(--sb-text-faint)]">{peer.location}</p>}
        </div>
      </button>

      {visibleSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-[var(--sb-bg-inset)] px-2.5 py-1 text-[11px] text-[var(--sb-text-muted)] ring-1 ring-inset ring-[var(--sb-border)]"
            >
              {skill}
            </span>
          ))}
          {extraSkillCount > 0 && (
            <span className="rounded-full px-2 py-1 text-[11px] text-[var(--sb-text-faint)]">+{extraSkillCount}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant={peer.isConnected ? "secondary" : "primary"}
          size="sm"
          loading={connectPending}
          onClick={() => onToggleConnect(peer)}
          className="flex-1"
        >
          {peer.isConnected ? (
            <>
              <UserCheck size={14} /> {t("connect.connectedAction")}
            </>
          ) : (
            <>
              <UserPlus size={14} /> {t("connect.connectAction")}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/messages?to=${peer.uuid}`)}
          className="flex-1"
        >
          <MessageSquare size={14} /> {t("connect.messageAction")}
        </Button>
      </div>
    </Card>
  );
}
