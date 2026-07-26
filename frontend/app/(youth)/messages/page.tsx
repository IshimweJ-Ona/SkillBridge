"use client";

import { AlertTriangle, Send } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useTranslations } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// No messaging module exists in the backend (see the project plan's
// reconciliation notes) - this screen is local, static demo content only,
// not wired to any API, so it never pretends to send a real message.
interface DemoMessage {
  from: "them" | "me";
  text: string;
  time: string;
}

interface DemoThread {
  id: string;
  name: string;
  preview: string;
  unread?: boolean;
  messages: DemoMessage[];
}

const THREADS: DemoThread[] = [
  {
    id: "1",
    name: "Tech Solutions Ltd",
    preview: "Thank you! I'm very interested with your appl...",
    unread: true,
    messages: [
      { from: "them", text: "Hi, we reviewed your application and impressed with your portfolio.", time: "2:30 PM" },
      { from: "them", text: "We'd like to schedule an interview. Are you available this week?", time: "2:31 PM" },
      { from: "me", text: "Yes, I'm available Wednesday or Thursday.", time: "2:40 PM" },
      { from: "them", text: "Great! How about Wednesday at 3PM?", time: "2:42 PM" },
      { from: "me", text: "That works perfectly.", time: "2:45 PM" },
    ],
  },
  {
    id: "2",
    name: "Creative Agency",
    preview: "We'd like to invite you for the next stage",
    messages: [{ from: "them", text: "We'd like to invite you for the next stage of our hiring process.", time: "Yesterday" }],
  },
  {
    id: "3",
    name: "Startup Rwanda",
    preview: "Looking forward to working with you",
    messages: [{ from: "them", text: "Looking forward to working with you on the mobile app project.", time: "2 days ago" }],
  },
];

export default function MessagesPage() {
  const t = useTranslations();
  const [activeId, setActiveId] = useState(THREADS[0].id);
  const [draft, setDraft] = useState("");
  const active = THREADS.find((thread) => thread.id === activeId)!;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-start gap-2 rounded-[var(--sb-radius-md)] border border-[var(--sb-warning)]/30 bg-[var(--sb-warning-soft)] p-3 text-xs text-[var(--sb-warning)]">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        {t("messages.demoWarning")}
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] sm:grid-cols-[280px_1fr]">
        <div className="overflow-y-auto border-r border-[var(--sb-border)] bg-[var(--sb-bg-panel)]">
          {THREADS.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setActiveId(thread.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-[var(--sb-border)] p-3 text-left hover:bg-[var(--sb-bg-panel-hover)]",
                activeId === thread.id && "bg-[var(--sb-bg-panel-hover)]",
              )}
            >
              <Avatar firstName={thread.name.charAt(0)} lastName={thread.name.charAt(1) ?? ""} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-semibold text-[var(--sb-text)]">{thread.name}</p>
                  {thread.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--sb-primary)]" />}
                </div>
                <p className="truncate text-[11px] text-[var(--sb-text-muted)]">{thread.preview}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col bg-[var(--sb-bg-inset)]">
          <div className="flex items-center gap-3 border-b border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3">
            <Avatar firstName={active.name.charAt(0)} lastName={active.name.charAt(1) ?? ""} size={32} />
            <p className="text-sm font-semibold">{active.name}</p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {active.messages.map((message, index) => (
              <div key={index} className={cn("flex", message.from === "me" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-[var(--sb-radius-md)] px-3 py-2 text-xs",
                    message.from === "me"
                      ? "bg-[var(--sb-primary)] text-white"
                      : "border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] text-[var(--sb-text)]",
                  )}
                >
                  {message.text}
                  <p className={cn("mt-1 text-[10px]", message.from === "me" ? "text-white/70" : "text-[var(--sb-text-faint)]")}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setDraft("");
            }}
            className="flex items-center gap-2 border-t border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("messages.typePlaceholder")}
              className="h-9 flex-1 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-sm text-[var(--sb-text)] placeholder:text-[var(--sb-text-faint)] focus:border-[var(--sb-primary)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-[var(--sb-primary)] text-white disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
