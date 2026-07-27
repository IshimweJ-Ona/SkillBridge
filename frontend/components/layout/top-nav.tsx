"use client";

import { Menu } from "@/lib/icons";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationBell } from "./notification-bell";
import { useRouter } from "next/navigation";

export function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations();

  if (!user) return null;

  return (
    <header className="sb-print-hide sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--sb-border)] bg-[var(--sb-bg-panel)]/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <LanguageSwitcher />
        <NotificationBell />
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-[var(--sb-radius-sm)] p-1 pr-2 hover:bg-[var(--sb-bg-panel-hover)]"
          >
            <Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.profile?.avatarUrl} size={30} />
            <span className="hidden text-sm font-medium sm:inline">{user.firstName}</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="sb-fade-in absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] py-1 shadow-[var(--sb-shadow-lg)]">
                {user.role === "YOUTH_USER" && (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3.5 py-2 text-sm text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
                    >
                      {t("topnav.myProfile")}
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3.5 py-2 text-sm text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
                    >
                      {t("topnav.accountSettings")}
                    </Link>
                  </>
                )}
                {user.role === "EMPLOYER" && (
                  <Link
                    href="/employer/company"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-sm text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
                  >
                    {t("topnav.companyProfile")}
                  </Link>
                )}
                {user.role === "ADMINISTRATOR" && (
                  <Link
                    href="/admin/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-sm text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]"
                  >
                    {t("topnav.platformSettings")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    router.push("/sign-in");
                  }}
                  className="block w-full px-3.5 py-2 text-left text-sm text-[var(--sb-danger)] hover:bg-[var(--sb-bg-panel-hover)]"
                >
                  {t("common.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
