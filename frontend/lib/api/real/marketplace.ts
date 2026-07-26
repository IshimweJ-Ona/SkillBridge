import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type {
  ContractStatus,
  EarningsSummary,
  FreelanceListing,
  FreelanceReview,
  Paginated,
  PricingType,
  ServiceContract,
  ServiceRequest,
} from "../types";

const base = API_BASES.marketplace;

export const marketplaceApi = {
  myEarnings: () => apiFetch<EarningsSummary>(base, "/marketplace/earnings/me"),

  list: (query?: { category?: string; search?: string; page?: number; limit?: number }) =>
    apiFetch<Paginated<FreelanceListing>>(base, "/marketplace/listings", { query }),

  get: (uuid: string) => apiFetch<FreelanceListing>(base, `/marketplace/listings/${uuid}`),

  myListings: () => apiFetch<FreelanceListing[]>(base, "/marketplace/listings/mine"),

  createListing: (body: {
    title: string;
    description: string;
    category: string;
    pricingType?: PricingType;
    priceCents?: number;
    timelineDays?: number;
    portfolioUrls?: string[];
  }) => apiFetch<FreelanceListing>(base, "/marketplace/listings", { method: "POST", body }),

  createRequest: (listingUuid: string, body: { contactName?: string; contactEmail?: string; requirements: string }) =>
    apiFetch<ServiceRequest>(base, `/marketplace/listings/${listingUuid}/requests`, { method: "POST", body }),

  myRequests: () => apiFetch<ServiceRequest[]>(base, "/marketplace/requests/mine"),

  createContract: (requestUuid: string, body: { terms: string; deliverables: string; timelineDays?: number; feeCents?: number }) =>
    apiFetch<ServiceContract>(base, `/marketplace/requests/${requestUuid}/contracts`, { method: "POST", body }),

  myContracts: () => apiFetch<ServiceContract[]>(base, "/marketplace/contracts/mine"),

  updateContractStatus: (uuid: string, status: ContractStatus) =>
    apiFetch<ServiceContract>(base, `/marketplace/contracts/${uuid}/status`, { method: "PATCH", body: { status } }),

  createReview: (contractUuid: string, body: { rating: number; comment?: string }) =>
    apiFetch<FreelanceReview>(base, `/marketplace/contracts/${contractUuid}/reviews`, { method: "POST", body }),

  raiseDispute: (transactionUuid: string, reason: string) =>
    apiFetch<{ uuid: string }>(base, `/marketplace/transactions/${transactionUuid}/disputes`, {
      method: "POST",
      body: { reason },
    }),
};
