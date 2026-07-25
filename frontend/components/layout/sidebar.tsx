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
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "sb-print-hide fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--sb-border)] bg-[var(--sb-bg-panel)] transition-transform lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--sb-border)] px-4">
          <Logo />
          <button type="button" onClick={onClose} className="text-[var(--sb-text-muted)] lg:hidden">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href.split("?")[0];
            const Icon = item.icon;
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--sb-radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]"
                    : "text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]",
                )}
              >
                <Icon size={17} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--sb-border)] p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[var(--sb-radius-sm)] px-3 py-2 text-sm font-medium text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-danger)]"
          >
            <LogOut size={17} />
            {t("common.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
