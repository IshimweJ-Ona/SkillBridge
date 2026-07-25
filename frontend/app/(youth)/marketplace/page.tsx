"use client";

import { Search, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { marketplace, type FreelanceListing } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatRwf } from "@/lib/utils";

export default function MarketplacePage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FreelanceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await marketplace.list({ search: search || undefined, limit: 20 });
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("marketplace.title")}</h1>
          <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.subtitle")}</p>
        </div>
        <LinkButton href="/marketplace/my-listings/new" size="sm">
          {t("marketplace.listService")}
        </LinkButton>
      </div>

      <Input leadingIcon={<Search size={15} />} placeholder={t("marketplace.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading && Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}
        {!loading && items.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState icon={Store} title={t("marketplace.noListingsTitle")} description={t("marketplace.noListingsDescription")} />
          </div>
        )}
        {!loading &&
          items.map((listing) => (
            <Link key={listing.uuid} href={`/marketplace/${listing.uuid}`}>
              <Card className="h-full p-4 transition-colors hover:border-[var(--sb-border-strong)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--sb-text)]">{listing.title}</p>
                  <StatusPill tone="neutral">{listing.category}</StatusPill>
                </div>
                <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
                  {listing.user ? `${listing.user.firstName} ${listing.user.lastName}` : t("marketplace.freelancerFallback")}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-[var(--sb-text-muted)]">{listing.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--sb-text)]">
                    {formatRwf(listing.priceCents)}
                    {listing.pricingType === "HOURLY" && "/hr"}
                  </span>
                  <span className="text-[var(--sb-text-faint)]">{listing.timelineDays} {t("marketplace.dayDelivery")}</span>
                </div>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
