import {
  ApiError,
  type ContractStatus,
  type EarningsSummary,
  type FreelanceListing,
  type FreelanceReview,
  type Paginated,
  type PricingType,
  type ServiceContract,
  type ServiceRequest,
} from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

export const marketplaceApiMock = {
  async myEarnings(): Promise<EarningsSummary> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return (
      db.earnings[user.uuid] ?? {
        totalIncomeCents: 0,
        pendingEscrowCents: 0,
        contractCount: 0,
        transactions: [],
      }
    );
  },

  async list(query?: { category?: string; search?: string; page?: number; limit?: number }): Promise<Paginated<FreelanceListing>> {
    await mockLatency();
    const db = getDb();
    const search = query?.search?.toLowerCase().trim();
    const items = db.listings
      .filter((listing) => listing.status === "ACTIVE")
      .filter((listing) => !query?.category || listing.category === query.category)
      .filter((listing) => {
        if (!search) return true;
        return (
          listing.title.toLowerCase().includes(search) ||
          listing.description.toLowerCase().includes(search) ||
          listing.category.toLowerCase().includes(search)
        );
      });
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
    };
  },

  async get(uuid: string): Promise<FreelanceListing> {
    await mockLatency();
    const db = getDb();
    const listing = db.listings.find((candidate) => candidate.uuid === uuid);
    if (!listing) throw new ApiError(`Listing ${uuid} was not found.`, 404);
    return listing;
  },

  async myListings(): Promise<FreelanceListing[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return db.listings.filter((listing) => listing.ownerUuid === user.uuid);
  },

  async createListing(body: {
    title: string;
    description: string;
    category: string;
    pricingType?: PricingType;
    priceCents?: number;
    timelineDays?: number;
    portfolioUrls?: string[];
  }): Promise<FreelanceListing> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);

    const listing: FreelanceListing & { ownerUuid: string } = {
      uuid: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      category: body.category,
      pricingType: body.pricingType ?? "FIXED",
      priceCents: body.priceCents ?? 0,
      currency: "RWF",
      timelineDays: body.timelineDays ?? 7,
      portfolioUrls: body.portfolioUrls ?? [],
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      user: { uuid: user.uuid, firstName: user.firstName, lastName: user.lastName, profile: user.profile },
      reviews: [],
      ownerUuid: user.uuid,
    };

    db.listings.unshift(listing);
    saveDb(db);
    return listing;
  },

  async createRequest(
    listingUuid: string,
    body: { contactName?: string; contactEmail?: string; requirements: string },
  ): Promise<ServiceRequest> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const listing = db.listings.find((candidate) => candidate.uuid === listingUuid);
    if (!listing) throw new ApiError(`Listing ${listingUuid} was not found.`, 404);

    const request: ServiceRequest & { requesterUuid?: string } = {
      uuid: crypto.randomUUID(),
      contactName: body.contactName ?? null,
      contactEmail: body.contactEmail ?? null,
      requirements: body.requirements,
      status: "NEW",
      createdAt: new Date().toISOString(),
      listing,
      clientUser: { uuid: user.uuid, firstName: user.firstName, lastName: user.lastName },
      contract: null,
      requesterUuid: user.uuid,
    };

    db.serviceRequests.unshift(request);
    saveDb(db);
    return request;
  },

  async myRequests(): Promise<ServiceRequest[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return db.serviceRequests.filter((request) => request.listing.user?.uuid === user.uuid);
  },

  async createContract(
    requestUuid: string,
    body: { terms: string; deliverables: string; timelineDays?: number; feeCents?: number },
  ): Promise<ServiceContract> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const request = db.serviceRequests.find((candidate) => candidate.uuid === requestUuid);
    if (!request) throw new ApiError(`Service request ${requestUuid} was not found.`, 404);
    if (request.listing.user?.uuid !== user.uuid) {
      throw new ApiError("Only the listing owner can accept this request and create a contract.", 403);
    }

    const contract: ServiceContract & { freelancerUuid: string; clientUuid?: string } = {
      uuid: crypto.randomUUID(),
      terms: body.terms,
      deliverables: body.deliverables,
      timelineDays: body.timelineDays ?? request.listing.timelineDays,
      feeCents: body.feeCents ?? request.listing.priceCents,
      currency: request.listing.currency,
      status: "ACTIVE",
      acceptedAt: new Date().toISOString(),
      deliveredAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      listing: request.listing,
      transactions: [
        {
          uuid: crypto.randomUUID(),
          amountCents: body.feeCents ?? request.listing.priceCents,
          currency: request.listing.currency,
          status: "PENDING",
          type: "FREELANCE_ESCROW",
          createdAt: new Date().toISOString(),
        },
      ],
      review: null,
      freelancerUuid: user.uuid,
      clientUuid: request.clientUser?.uuid,
    };

    request.status = "CONTRACTED";
    request.contract = { uuid: contract.uuid };
    db.contracts.unshift(contract);
    saveDb(db);
    return contract;
  },

  async myContracts(): Promise<ServiceContract[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return db.contracts.filter(
      (contract) => contract.freelancerUuid === user.uuid || contract.clientUuid === user.uuid,
    );
  },

  async updateContractStatus(uuid: string, status: ContractStatus): Promise<ServiceContract> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const contract = db.contracts.find((candidate) => candidate.uuid === uuid);
    if (!contract) throw new ApiError(`Contract ${uuid} was not found.`, 404);
    if (contract.freelancerUuid !== user.uuid && contract.clientUuid !== user.uuid) {
      throw new ApiError("You are not a party to this contract.", 403);
    }

    contract.status = status;
    if (status === "DELIVERED") contract.deliveredAt = new Date().toISOString();
    if (status === "COMPLETED") {
      contract.completedAt = new Date().toISOString();
      contract.transactions = contract.transactions?.map((tx) => ({ ...tx, status: "COMPLETED" }));
    }
    saveDb(db);
    return contract;
  },

  async createReview(contractUuid: string, body: { rating: number; comment?: string }): Promise<FreelanceReview> {
    await mockLatency();
    const db = getDb();
    const contract = db.contracts.find((candidate) => candidate.uuid === contractUuid);
    if (!contract) throw new ApiError(`Contract ${contractUuid} was not found.`, 404);

    const review: FreelanceReview = {
      uuid: crypto.randomUUID(),
      rating: Math.max(1, Math.min(5, body.rating)),
      comment: body.comment ?? null,
      response: null,
      createdAt: new Date().toISOString(),
    };
    contract.review = review;
    contract.listing.reviews = [...(contract.listing.reviews ?? []), review];
    saveDb(db);
    return review;
  },

  async raiseDispute(transactionUuid: string, reason: string): Promise<{ uuid: string }> {
    await mockLatency();
    const db = getDb();
    for (const contract of db.contracts) {
      const transaction = contract.transactions?.find((tx) => tx.uuid === transactionUuid);
      if (transaction) {
        transaction.status = "DISPUTED";
        contract.status = "DISPUTED";
        saveDb(db);
        return { uuid: crypto.randomUUID() };
      }
    }
    void reason;
    throw new ApiError(`Transaction ${transactionUuid} was not found.`, 404);
  },
};
