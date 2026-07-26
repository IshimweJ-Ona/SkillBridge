"use client";

import { Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { ApiError, marketplace, type FreelanceListing } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatRwf } from "@/lib/utils";

export function ListingDetailClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const t = useTranslations();

  const [listing, setListing] = useState<FreelanceListing | null | undefined>(undefined);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [requirements, setRequirements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    marketplace
      .get(uuid)
      .then((result) => {
        if (active) setListing(result);
      })
      .catch(() => {
        if (active) setListing(null);
      });
    return () => {
      active = false;
    };
  }, [uuid]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await marketplace.createRequest(uuid, {
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        requirements,
      });
      setSent(true);
      show({ variant: "success", title: t("marketplace.requestSentTitle"), description: t("marketplace.requestSentBody") });
    } catch (err) {
      show({ variant: "error", title: t("marketplace.sendRequestError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  if (listing === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (!listing) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.notFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/marketplace")}>
          {t("marketplace.backToMarketplace")}
        </Button>
      </Card>
    );
  }

  const isOwner = listing.user?.uuid === user?.uuid;
  const averageRating =
    listing.reviews && listing.reviews.length > 0
      ? (listing.reviews.reduce((sum, review) => sum + review.rating, 0) / listing.reviews.length).toFixed(1)
      : null;

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.back()} className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]">
        &larr; {t("marketplace.backToMarketplace")}
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusPill tone="neutral">{listing.category}</StatusPill>
            <h1 className="mt-2 text-lg font-semibold">{listing.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              {listing.user && <Avatar firstName={listing.user.firstName} lastName={listing.user.lastName} size={28} />}
              <span className="text-xs text-[var(--sb-text-muted)]">
                {listing.user ? `${listing.user.firstName} ${listing.user.lastName}` : t("marketplace.freelancerFallback")}
              </span>
              {averageRating && (
                <span className="flex items-center gap-1 text-xs text-[var(--sb-warning)]">
                  <Star size={12} fill="currentColor" /> {averageRating} ({listing.reviews?.length})
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--sb-text)]">
              {formatRwf(listing.priceCents)}
              {listing.pricingType === "HOURLY" && <span className="text-xs font-normal">/hr</span>}
            </p>
            <p className="text-xs text-[var(--sb-text-faint)]">{listing.timelineDays} {t("marketplace.dayDelivery")}</p>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-line text-sm text-[var(--sb-text-muted)]">{listing.description}</p>
      </Card>

      {isOwner ? (
        <Card className="p-5 text-center">
          <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.ownListingBody")}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push("/marketplace/requests")}>
            {t("marketplace.viewRequests")}
          </Button>
        </Card>
      ) : sent ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-[var(--sb-text)]">{t("marketplace.requestSentTitle")}</p>
          <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{t("marketplace.requestSentBody")}</p>
        </Card>
      ) : (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("marketplace.requestService")}</h2>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("marketplace.yourName")} value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input label={t("marketplace.contactEmail")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <Textarea
              label={t("marketplace.requirements")}
              placeholder={t("marketplace.requirementsPlaceholder")}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              required
            />
            <Button type="submit" loading={submitting}>
              {t("marketplace.sendRequest")}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
