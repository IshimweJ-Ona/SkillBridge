"use client";

import { ArrowDownRight, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { marketplace, type EarningsSummary, type MarketplaceTransaction } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate, formatRwf } from "@/lib/utils";

function transactionTone(transaction: MarketplaceTransaction): "success" | "warning" | "danger" | "info" {
  if (transaction.type === "REFUND") return "info";
  if (transaction.status === "COMPLETED") return "success";
  if (transaction.status === "FAILED" || transaction.status === "DISPUTED") return "danger";
  return "warning";
}

export default function WalletPage() {
  const t = useTranslations();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplace
      .myEarnings()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("wallet.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("wallet.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[var(--sb-success)]">
            <ArrowUpRight size={14} />
            <span className="text-xs text-[var(--sb-text-faint)]">{t("wallet.totalIncome")}</span>
          </div>
          <p className="mt-2 text-xl font-bold">
            {loading || !summary ? <Skeleton className="h-7 w-24" /> : formatRwf(summary.totalIncomeCents)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[var(--sb-warning)]">
            <ArrowDownRight size={14} />
            <span className="text-xs text-[var(--sb-text-faint)]">{t("wallet.pendingEscrow")}</span>
          </div>
          <p className="mt-2 text-xl font-bold">
            {loading || !summary ? <Skeleton className="h-7 w-24" /> : formatRwf(summary.pendingEscrowCents)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[var(--sb-text-muted)]">
            <WalletIcon size={14} />
            <span className="text-xs text-[var(--sb-text-faint)]">{t("wallet.contracts")}</span>
          </div>
          <p className="mt-2 text-xl font-bold">{loading || !summary ? <Skeleton className="h-7 w-10" /> : summary.contractCount}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("wallet.transactionHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-32 w-full" />}
          {!loading && summary && summary.transactions.length === 0 && (
            <EmptyState icon={WalletIcon} title={t("wallet.noTransactionsTitle")} description={t("wallet.noTransactionsDescription")} />
          )}
          {!loading && summary && summary.transactions.length > 0 && (
            <div className="space-y-2">
              {summary.transactions.map((transaction) => (
                <div key={transaction.uuid} className="flex items-center justify-between rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] px-3 py-2.5 text-xs">
                  <div>
                    <p className="font-medium text-[var(--sb-text)]">{transaction.type === "REFUND" ? t("wallet.refund") : transaction.type}</p>
                    <p className="text-[var(--sb-text-faint)]">{formatDate(transaction.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--sb-text)]">{formatRwf(transaction.amountCents)}</p>
                    <StatusPill tone={transactionTone(transaction)}>
                      {transaction.type === "REFUND" ? t("wallet.refunded") : transaction.status}
                    </StatusPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
