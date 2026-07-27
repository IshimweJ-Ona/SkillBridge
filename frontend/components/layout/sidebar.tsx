"use client";

import { LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-config";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";

export function Sidebar({
  items,
  mobileOpen,
  onClose,
}: {
  items: NavItem[];
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const t = useTranslations();

  const handleLogout = async () => {
    await logout();
    router.push("/sign-in");
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "sb-print-hide fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--sb-border)] bg-[var(--sb-bg-panel)] shadow-[var(--sb-shadow-lg)] transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--sb-border)] px-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href.split("?")[0];
            const Icon = item.icon;
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[var(--sb-radius-sm)] px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]"
                    : "text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]",
                )}
              >
                {active && (
                  <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--sb-primary)]" />
                )}
                <Icon
                  size={17}
                  className={cn(
                    "shrink-0 transition-transform",
                    active ? "text-[var(--sb-primary)]" : "text-[var(--sb-text-faint)] group-hover:text-[var(--sb-text)]",
                  )}
                />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--sb-border)] p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[var(--sb-radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--sb-text-muted)] transition-colors hover:bg-[var(--sb-danger-soft)] hover:text-[var(--sb-danger)]"
          >
            <LogOut size={17} />
            {t("common.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
