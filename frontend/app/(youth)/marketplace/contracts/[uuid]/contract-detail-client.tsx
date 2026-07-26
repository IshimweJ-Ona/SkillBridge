"use client";

import { AlertTriangle, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { ApiError, marketplace, type ServiceContract } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate, formatRwf } from "@/lib/utils";

export function ContractDetailClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const t = useTranslations();

  const [contract, setContract] = useState<ServiceContract | null | undefined>(undefined);
  const [updating, setUpdating] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const load = () =>
    marketplace
      .myContracts()
      .then((items) => setContract(items.find((item) => item.uuid === uuid) ?? null));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);

  if (contract === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (!contract) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.contractNotFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/marketplace/requests")}>
          {t("marketplace.backToRequests")}
        </Button>
      </Card>
    );
  }

  const isFreelancer = contract.listing.user?.uuid === user?.uuid;

  const handleMarkDelivered = async () => {
    setUpdating(true);
    try {
      await marketplace.updateContractStatus(uuid, "DELIVERED");
      show({ variant: "success", title: t("marketplace.markDeliveredSuccess") });
      await load();
    } catch (err) {
      show({ variant: "error", title: t("marketplace.updateContractError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUpdating(false);
    }
  };

  const handleReview = async () => {
    setUpdating(true);
    try {
      await marketplace.createReview(uuid, { rating: reviewRating, comment: reviewComment || undefined });
      show({ variant: "success", title: t("marketplace.reviewSubmittedSuccess") });
      await load();
    } catch (err) {
      show({ variant: "error", title: t("marketplace.submitReviewError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUpdating(false);
    }
  };

  const handleDispute = async () => {
    const transactionUuid = contract.transactions?.[0]?.uuid;
    if (!transactionUuid) return;
    setUpdating(true);
    try {
      await marketplace.raiseDispute(transactionUuid, disputeReason);
      show({ variant: "success", title: t("marketplace.disputeRaisedTitle"), description: t("marketplace.disputeRaisedBody") });
      setShowDisputeForm(false);
      await load();
    } catch (err) {
      show({ variant: "error", title: t("marketplace.disputeError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.back()} className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]">
        &larr; {t("common.back")}
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{contract.listing.title}</h1>
            <p className="text-xs text-[var(--sb-text-muted)]">{t("marketplace.contractedOn", { date: formatDate(contract.createdAt) })}</p>
          </div>
          <StatusPill tone={contract.status === "COMPLETED" ? "success" : contract.status === "DISPUTED" ? "danger" : "info"}>
            {contract.status}
          </StatusPill>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <p className="text-[var(--sb-text-faint)]">{t("marketplace.contractFee")}</p>
            <p className="font-medium text-[var(--sb-text)]">{formatRwf(contract.feeCents)}</p>
          </div>
          <div>
            <p className="text-[var(--sb-text-faint)]">{t("marketplace.contractTimeline")}</p>
            <p className="font-medium text-[var(--sb-text)]">{t("marketplace.contractTimelineDays", { days: contract.timelineDays })}</p>
          </div>
          <div>
            <p className="text-[var(--sb-text-faint)]">{t("marketplace.contractDelivered")}</p>
            <p className="font-medium text-[var(--sb-text)]">
              {contract.deliveredAt ? formatDate(contract.deliveredAt) : t("marketplace.contractNotYetDelivered")}
            </p>
          </div>
          <div>
            <p className="text-[var(--sb-text-faint)]">{t("marketplace.contractRole")}</p>
            <p className="font-medium text-[var(--sb-text)]">{isFreelancer ? t("marketplace.freelancer") : t("marketplace.client")}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div>
            <p className="text-xs font-medium text-[var(--sb-text-muted)]">{t("marketplace.terms")}</p>
            <p className="text-sm text-[var(--sb-text)]">{contract.terms}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--sb-text-muted)]">{t("marketplace.deliverables")}</p>
            <p className="text-sm text-[var(--sb-text)]">{contract.deliverables}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {isFreelancer && contract.status === "ACTIVE" && (
            <Button size="sm" loading={updating} onClick={handleMarkDelivered}>
              {t("marketplace.markDelivered")}
            </Button>
          )}
          {contract.status !== "COMPLETED" && contract.status !== "DISPUTED" && (
            <Button size="sm" variant="destructive" onClick={() => setShowDisputeForm((prev) => !prev)}>
              {t("marketplace.raiseDispute")}
            </Button>
          )}
        </div>

        {showDisputeForm && (
          <div className="mt-3 rounded-[var(--sb-radius-md)] border border-[var(--sb-danger)]/30 bg-[var(--sb-danger-soft)] p-3">
            <div className="flex items-start gap-2 text-xs text-[var(--sb-danger)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {t("marketplace.disputeWarning")}
            </div>
            <Textarea
              className="mt-2"
              placeholder={t("marketplace.disputeReasonPlaceholder")}
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
            />
            <Button size="sm" variant="destructive" className="mt-2" loading={updating} onClick={handleDispute}>
              {t("marketplace.submitDispute")}
            </Button>
          </div>
        )}
      </Card>

      {!isFreelancer && contract.status === "DELIVERED" && !contract.review && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("marketplace.leaveReview")}</h2>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setReviewRating(star)} aria-label={`${star} stars`}>
                <Star size={20} className={star <= reviewRating ? "text-[var(--sb-warning)]" : "text-[var(--sb-text-faint)]"} fill={star <= reviewRating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <Textarea className="mt-2" placeholder={t("marketplace.reviewPlaceholder")} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} />
          <Button size="sm" className="mt-2" loading={updating} onClick={handleReview}>
            {t("marketplace.submitReview")}
          </Button>
        </Card>
      )}

      {contract.review && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("marketplace.review")}</h2>
          <div className="mt-1 flex items-center gap-1 text-[var(--sb-warning)]">
            {Array.from({ length: contract.review.rating }, (_, index) => (
              <Star key={index} size={14} fill="currentColor" />
            ))}
          </div>
          {contract.review.comment && <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{contract.review.comment}</p>}
        </Card>
      )}
    </div>
  );
}
