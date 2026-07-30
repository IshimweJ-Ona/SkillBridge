"use client";

import { ArrowLeft, Loader2, MessageSquarePlus, Search, Send, X } from "@/lib/icons";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { UndrawMessages, UndrawPeopleSearch } from "react-undraw-illustrations";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { messages as messagesApi, type ChatMessage, type MessageableContact, type MessageThread } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { cn, formatRelativeTime } from "@/lib/utils";

function formatClockTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function counterpart(thread: MessageThread, myUuid: string) {
  return thread.participants.find((participant) => participant.uuid !== myUuid) ?? thread.participants[0];
}

function counterpartLabel(contact: { firstName: string; lastName: string; companyName?: string | null }) {
  return contact.companyName ? `${contact.firstName} ${contact.lastName} · ${contact.companyName}` : `${contact.firstName} ${contact.lastName}`;
}

/**
 * Fully functional messaging UI shared by the Youth and Employer messages
 * pages. There is no seeded/demo conversation data anywhere in this
 * component - every thread, contact, and message comes from
 * lib/api/mock/messages.ts (real job-application relationships, persisted
 * locally) or, once the backend ships the messaging service, from
 * lib/api/real/messages.ts. See lib/api/types.ts for the shared contract.
 */
export function MessagesView() {
  return (
    <Suspense>
      <MessagesViewInner />
    </Suspense>
  );
}

function MessagesViewInner() {
  const { user } = useAuth();
  const t = useTranslations();
  const { show } = useToast();
  const searchParams = useSearchParams();
  // Coming from the Connect directory's "Message" button (/messages?to=uuid) -
  // opens the composer with that person preselected once their contact
  // record loads.
  const prefillRecipientUuid = searchParams.get("to");
  const appliedPrefillRef = useRef(false);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const [activeUuid, setActiveUuid] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const [composerOpen, setComposerOpen] = useState(false);
  const [contacts, setContacts] = useState<MessageableContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [composerRecipient, setComposerRecipient] = useState<MessageableContact | null>(null);
  const [composerDraft, setComposerDraft] = useState("");
  const [composerSending, setComposerSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const items = await messagesApi.listThreads();
      setThreads(items);
    } catch {
      // transient failure - keep whatever was already on screen
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 20000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeMessages]);

  const openThread = useCallback(async (uuid: string) => {
    setComposerOpen(false);
    setActiveUuid(uuid);
    setMobileView("thread");
    setMessagesLoading(true);
    try {
      const items = await messagesApi.listMessages(uuid);
      setActiveMessages(items);
      await messagesApi.markThreadRead(uuid);
      setThreads((current) => current.map((thread) => (thread.uuid === uuid ? { ...thread, unreadCount: 0 } : thread)));
    } catch {
      setActiveMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUuid || !draft.trim() || !user) return;
    const body = draft.trim();
    setDraft("");
    setSending(true);

    const optimistic: ChatMessage = {
      uuid: `optimistic-${Date.now()}`,
      threadUuid: activeUuid,
      senderUuid: user.uuid,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setActiveMessages((current) => [...current, optimistic]);

    try {
      const saved = await messagesApi.sendMessage(activeUuid, body);
      setActiveMessages((current) => current.map((message) => (message.uuid === optimistic.uuid ? saved : message)));
      loadThreads();
    } catch {
      setActiveMessages((current) => current.filter((message) => message.uuid !== optimistic.uuid));
      setDraft(body);
      show({ variant: "error", title: t("messages.sendFailedTitle"), description: t("messages.sendFailedDescription") });
    } finally {
      setSending(false);
    }
  };

  const openComposer = async () => {
    setActiveUuid(null);
    setComposerOpen(true);
    setMobileView("thread");
    setContactsLoading(true);
    try {
      const items = await messagesApi.listContacts();
      setContacts(items);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    if (!prefillRecipientUuid || appliedPrefillRef.current) return;
    appliedPrefillRef.current = true;
    openComposer();
  }, [prefillRecipientUuid]);

  useEffect(() => {
    if (!prefillRecipientUuid || composerRecipient) return;
    const match = contacts.find((contact) => contact.uuid === prefillRecipientUuid);
    if (match) setComposerRecipient(match);
  }, [contacts, prefillRecipientUuid, composerRecipient]);

  const filteredContacts = contactSearch.trim()
    ? contacts.filter((contact) =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(contactSearch.trim().toLowerCase()),
      )
    : contacts;

  const handleStartThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!composerRecipient || !composerDraft.trim()) return;
    setComposerSending(true);
    try {
      const thread = await messagesApi.startThread(composerRecipient.uuid, composerDraft.trim());
      setComposerOpen(false);
      setComposerRecipient(null);
      setComposerDraft("");
      await loadThreads();
      await openThread(thread.uuid);
    } catch {
      show({ variant: "error", title: t("messages.sendFailedTitle"), description: t("messages.sendFailedDescription") });
    } finally {
      setComposerSending(false);
    }
  };

  const activeThread = threads.find((thread) => thread.uuid === activeUuid) ?? null;
  const activeCounterpart = activeThread && user ? counterpart(activeThread, user.uuid) : null;
  const showRightPane = mobileView === "thread";

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[var(--sb-text)]">{t("messages.title")}</h1>
          <p className="text-xs text-[var(--sb-text-muted)]">{t("messages.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={openComposer}
          className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--sb-radius-sm)] bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] px-3 text-xs font-medium text-white shadow-[0_4px_14px_-2px_var(--sb-primary-glow)] hover:from-[var(--sb-primary-hover)] hover:to-[var(--sb-primary-hover)]"
        >
          <MessageSquarePlus size={15} />
          {t("messages.newConversation")}
        </button>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] shadow-[var(--sb-shadow-sm)] sm:grid-cols-[300px_1fr]">
        {/* Thread list */}
        <div
          className={cn(
            "flex-col overflow-y-auto border-[var(--sb-border)] sm:flex sm:border-r",
            mobileView === "list" ? "flex" : "hidden",
          )}
        >
          {threadsLoading && (
            <div className="space-y-2 p-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!threadsLoading && threads.length === 0 && (
            <div className="p-4">
              <EmptyState
                illustration={UndrawMessages}
                title={t("messages.emptyInboxTitle")}
                description={t("messages.emptyInboxDescription")}
              />
            </div>
          )}

          {!threadsLoading &&
            threads.map((thread) => {
              if (!user) return null;
              const other = counterpart(thread, user.uuid);
              const isActive = thread.uuid === activeUuid && !composerOpen;
              return (
                <button
                  key={thread.uuid}
                  type="button"
                  onClick={() => openThread(thread.uuid)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-[var(--sb-border)] p-3 text-left transition-colors hover:bg-[var(--sb-bg-panel-hover)]",
                    isActive && "bg-[var(--sb-bg-panel-hover)]",
                  )}
                >
                  <Avatar firstName={other.firstName} lastName={other.lastName} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-[var(--sb-text)]">
                        {other.firstName} {other.lastName}
                      </p>
                      {thread.lastMessage && (
                        <span className="shrink-0 text-[10px] text-[var(--sb-text-faint)]">
                          {formatRelativeTime(thread.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {other.companyName && (
                      <p className="truncate text-[10px] text-[var(--sb-text-faint)]">{other.companyName}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-[var(--sb-text-muted)]">
                        {thread.lastMessage?.body ?? t("messages.noMessagesYet")}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--sb-primary)] px-1 text-[10px] font-semibold text-white">
                          {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Right pane: conversation, composer, or empty placeholder */}
        <div className={cn("flex-col bg-[var(--sb-bg-inset)] sm:flex", showRightPane ? "flex" : "hidden")}>
          {composerOpen && (
            <NewConversationPanel
              contacts={filteredContacts}
              totalContacts={contacts.length}
              loading={contactsLoading}
              recipient={composerRecipient}
              draft={composerDraft}
              sending={composerSending}
              search={contactSearch}
              onSearchChange={setContactSearch}
              onBack={() => {
                setComposerOpen(false);
                setMobileView("list");
                setContactSearch("");
              }}
              onSelectRecipient={setComposerRecipient}
              onDraftChange={setComposerDraft}
              onSubmit={handleStartThread}
              t={t}
            />
          )}

          {!composerOpen && activeThread && activeCounterpart && (
            <>
              <div className="flex items-center gap-3 border-b border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3">
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] sm:hidden"
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar firstName={activeCounterpart.firstName} lastName={activeCounterpart.lastName} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--sb-text)]">
                    {activeCounterpart.firstName} {activeCounterpart.lastName}
                  </p>
                  {activeCounterpart.companyName && (
                    <p className="truncate text-[11px] text-[var(--sb-text-faint)]">{activeCounterpart.companyName}</p>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messagesLoading && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--sb-text-faint)]" />
                  </div>
                )}
                {!messagesLoading &&
                  activeMessages.map((message) => {
                    const mine = message.senderUuid === user?.uuid;
                    return (
                      <div key={message.uuid} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[75%] rounded-[var(--sb-radius-md)] px-3 py-2 text-xs",
                            mine
                              ? "bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] text-white"
                              : "border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] text-[var(--sb-text)]",
                          )}
                        >
                          {message.body}
                          <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-[var(--sb-text-faint)]")}>
                            {formatClockTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t("messages.typePlaceholder")}
                  className="h-9 flex-1 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-sm text-[var(--sb-text)] placeholder:text-[var(--sb-text-faint)] focus:border-[var(--sb-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--sb-primary-soft)]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] text-white disabled:opacity-40"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </form>
            </>
          )}

          {!composerOpen && !activeThread && (
            <div className="hidden h-full items-center justify-center p-8 sm:flex">
              <EmptyState
                illustration={UndrawMessages}
                title={t("messages.selectConversationTitle")}
                description={t("messages.selectConversationDescription")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewConversationPanel({
  contacts,
  totalContacts,
  loading,
  recipient,
  draft,
  sending,
  search,
  onSearchChange,
  onBack,
  onSelectRecipient,
  onDraftChange,
  onSubmit,
  t,
}: {
  contacts: MessageableContact[];
  totalContacts: number;
  loading: boolean;
  recipient: MessageableContact | null;
  draft: string;
  sending: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onSelectRecipient: (contact: MessageableContact | null) => void;
  onDraftChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)]"
        >
          {/* Back on mobile, close on desktop - same action either way */}
          <span className="sm:hidden"><ArrowLeft size={16} /></span>
          <span className="hidden sm:inline"><X size={16} /></span>
        </button>
        <p className="text-sm font-semibold text-[var(--sb-text)]">{t("messages.newConversation")}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {!loading && totalContacts === 0 && (
          <EmptyState
            illustration={UndrawPeopleSearch}
            title={t("messages.noContactsTitle")}
            description={t("messages.noContactsDescription")}
          />
        )}

        {!loading && totalContacts > 0 && !recipient && (
          <div className="space-y-3">
            <Input
              leadingIcon={<Search size={15} />}
              placeholder={t("messages.searchContactsPlaceholder")}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--sb-text-faint)]">
              {t("messages.chooseRecipient")}
            </p>
            {contacts.length === 0 && (
              <p className="py-4 text-center text-xs text-[var(--sb-text-muted)]">{t("messages.noContactsMatch")}</p>
            )}
            {contacts.map((contact) => (
              <button
                key={contact.uuid}
                type="button"
                onClick={() => onSelectRecipient(contact)}
                className="flex w-full items-center gap-3 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3 text-left transition-colors hover:border-[var(--sb-primary)]/50 hover:bg-[var(--sb-bg-panel-hover)]"
              >
                <Avatar firstName={contact.firstName} lastName={contact.lastName} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--sb-text)]">{counterpartLabel(contact)}</p>
                  <p className="truncate text-[11px] text-[var(--sb-text-muted)]">{contact.context}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {recipient && (
          <form onSubmit={onSubmit} className="flex h-full flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3">
                <Avatar firstName={recipient.firstName} lastName={recipient.lastName} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--sb-text)]">{counterpartLabel(recipient)}</p>
                  <p className="truncate text-[11px] text-[var(--sb-text-muted)]">{recipient.context}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRecipient(null)}
                  className="ml-auto shrink-0 text-[11px] text-[var(--sb-text-faint)] hover:text-[var(--sb-primary)]"
                >
                  {t("messages.change")}
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={t("messages.firstMessagePlaceholder")}
                rows={5}
                className="mt-4 w-full resize-none rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-3 text-sm text-[var(--sb-text)] placeholder:text-[var(--sb-text-faint)] focus:border-[var(--sb-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--sb-primary-soft)]"
              />
            </div>
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] text-sm font-medium text-white shadow-[0_4px_14px_-2px_var(--sb-primary-glow)] disabled:opacity-40"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {t("messages.send")}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
