"use client";

import { Star } from "@/lib/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UndrawAddToCart } from "react-undraw-illustrations";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { marketplace, type FreelanceListing } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatRwf } from "@/lib/utils";

export default function MyListingsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<FreelanceListing[] | null>(null);

  useEffect(() => {
    marketplace.myListings().then(setItems);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("marketplace.myListingsTitle")}</h1>
          <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.myListingsSubtitle")}</p>
        </div>
        <LinkButton href="/marketplace/my-listings/new" size="sm">
          {t("marketplace.newListing")}
        </LinkButton>
      </div>

      <div className="space-y-3">
        {items === null && Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
        {items !== null && items.length === 0 && (
          <EmptyState
            illustration={UndrawAddToCart}
            title={t("marketplace.noMyListingsTitle")}
            description={t("marketplace.noMyListingsDescription")}
            action={<LinkButton href="/marketplace/my-listings/new" size="sm">{t("marketplace.newListing")}</LinkButton>}
          />
        )}
        {items !== null &&
          items.map((listing) => {
            const averageRating =
              listing.reviews && listing.reviews.length > 0
                ? (listing.reviews.reduce((sum, review) => sum + review.rating, 0) / listing.reviews.length).toFixed(1)
                : null;
            return (
              <Card key={listing.uuid} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-[var(--sb-text)]">{listing.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--sb-text-faint)]">
                    <span>{formatRwf(listing.priceCents)}</span>
                    <span>{listing.timelineDays} {t("marketplace.dayDelivery")}</span>
                    {averageRating && (
                      <span className="flex items-center gap-1 text-[var(--sb-warning)]">
                        <Star size={11} fill="currentColor" /> {averageRating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill tone={listing.status === "ACTIVE" ? "success" : "neutral"}>{listing.status}</StatusPill>
                  <Link href={`/marketplace/${listing.uuid}`} className="text-xs text-[var(--sb-primary)] hover:underline">
                    {t("common.view")}
                  </Link>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
