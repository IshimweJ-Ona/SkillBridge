"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UndrawInboxCleanup } from "react-undraw-illustrations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ApiError, marketplace, type ServiceRequest } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

export default function MarketplaceRequestsPage() {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    marketplace.myRequests().then(setItems);
  }, []);

  const handleAccept = async (request: ServiceRequest) => {
    setAccepting(request.uuid);
    try {
      const contract = await marketplace.createContract(request.uuid, {
        terms: terms[request.uuid] || `Deliver ${request.listing.title} as described in the request.`,
        deliverables: request.requirements,
      });
      show({ variant: "success", title: t("marketplace.createContractSuccess") });
      router.push(`/marketplace/contracts/${contract.uuid}`);
    } catch (err) {
      show({ variant: "error", title: t("marketplace.createContractError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("marketplace.requestsTitle")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.requestsSubtitle")}</p>
      </div>

      <div className="space-y-3">
        {items === null && Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}
        {items !== null && items.length === 0 && (
          <EmptyState illustration={UndrawInboxCleanup} title={t("marketplace.noRequestsTitle")} description={t("marketplace.noRequestsDescription")} />
        )}
        {items !== null &&
          items.map((request) => (
            <Card key={request.uuid} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--sb-text)]">{request.listing.title}</p>
                  <p className="text-xs text-[var(--sb-text-muted)]">
                    {t("marketplace.fromClient", {
                      name: request.clientUser
                        ? `${request.clientUser.firstName} ${request.clientUser.lastName}`
                        : request.contactName ?? t("marketplace.clientFallback"),
                      date: formatDate(request.createdAt),
                    })}
                  </p>
                </div>
                <StatusPill tone={request.status === "CONTRACTED" ? "success" : "neutral"}>{request.status.replace("_", " ")}</StatusPill>
              </div>
              <p className="mt-2 text-xs text-[var(--sb-text-muted)]">{request.requirements}</p>

              {request.status !== "CONTRACTED" && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder={t("marketplace.contractTermsPlaceholder")}
                    value={terms[request.uuid] ?? ""}
                    onChange={(event) => setTerms((current) => ({ ...current, [request.uuid]: event.target.value }))}
                  />
                  <Button size="sm" loading={accepting === request.uuid} onClick={() => handleAccept(request)}>
                    {t("marketplace.acceptCreateContract")}
                  </Button>
                </div>
              )}
              {request.status === "CONTRACTED" && request.contract && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => router.push(`/marketplace/contracts/${request.contract!.uuid}`)}
                >
                  {t("marketplace.viewContract")}
                </Button>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
}
