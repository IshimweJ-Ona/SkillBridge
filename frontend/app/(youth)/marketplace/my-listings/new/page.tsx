"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError, marketplace } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";

export default function NewListingPage() {
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [pricingType, setPricingType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [price, setPrice] = useState("");
  const [timelineDays, setTimelineDays] = useState("7");
  const [portfolioSample, setPortfolioSample] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await marketplace.createListing({
        title,
        description,
        category,
        pricingType,
        priceCents: Math.round(Number(price || 0) * 100),
        timelineDays: Number(timelineDays || 7),
        portfolioUrls: portfolioSample ? [portfolioSample] : undefined,
      });
      show({ variant: "success", title: t("marketplace.createListingSuccess") });
      router.push("/marketplace/my-listings");
    } catch (err) {
      show({ variant: "error", title: t("marketplace.createListingError"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("marketplace.listServiceTitle")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("marketplace.listServiceSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("marketplace.serviceDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("marketplace.serviceTitleLabel")}
              placeholder={t("marketplace.serviceTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label={t("marketplace.descriptionLabel")}
              placeholder={t("marketplace.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28"
              required
            />
            <Input
              label={t("marketplace.categoryLabel")}
              placeholder={t("marketplace.categoryPlaceholder")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--sb-text-muted)]">{t("marketplace.pricingLabel")}</label>
                <select
                  value={pricingType}
                  onChange={(event) => setPricingType(event.target.value as "FIXED" | "HOURLY")}
                  className="mt-1.5 h-10 w-full rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-sm text-[var(--sb-text)] focus:border-[var(--sb-primary)] focus:outline-none"
                >
                  <option value="FIXED">{t("marketplace.fixedPrice")}</option>
                  <option value="HOURLY">{t("marketplace.hourly")}</option>
                </select>
              </div>
              <Input label={t("marketplace.priceLabel")} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <Input
                label={t("marketplace.deliveryLabel")}
                type="number"
                min="1"
                value={timelineDays}
                onChange={(e) => setTimelineDays(e.target.value)}
                required
              />
            </div>
            <FileUpload
              label={t("marketplace.portfolioSampleLabel")}
              value={portfolioSample}
              onChange={setPortfolioSample}
              folder="skillbridge/listing-portfolios"
              accept="image/*,.pdf"
            />
            <Button type="submit" loading={submitting}>
              {t("marketplace.publishListing")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
