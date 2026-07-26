import { ApiError, type Company, type Paginated } from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

export const companiesApiMock = {
  async create(body: {
    name: string;
    description?: string;
    sector?: string;
    location?: string;
    website?: string;
    logoUrl?: string;
  }): Promise<Company> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);

    const company: Company = {
      uuid: crypto.randomUUID(),
      name: body.name,
      description: body.description ?? null,
      sector: body.sector ?? null,
      location: body.location ?? null,
      website: body.website ?? null,
      logoUrl: body.logoUrl ?? null,
      // Mirrors the real backend: new companies start PENDING_VERIFICATION
      // and can't post jobs until an administrator verifies them via
      // /admin/companies.
      status: "PENDING_VERIFICATION",
    };

    db.companies.push(company);
    db.companyOwners[company.uuid] = user.uuid;
    saveDb(db);

    return company;
  },

  async mine(): Promise<Company[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return db.companies.filter((company) => db.companyOwners[company.uuid] === user.uuid);
  },

  async pendingVerification(): Promise<Paginated<Company>> {
    await mockLatency();
    const db = getDb();
    const items = db.companies.filter((company) => company.status === "PENDING_VERIFICATION");
    return { items, meta: { page: 1, limit: items.length || 1, total: items.length, totalPages: 1 } };
  },

  async verify(uuid: string): Promise<Company> {
    await mockLatency();
    const db = getDb();
    const company = db.companies.find((candidate) => candidate.uuid === uuid);
    if (!company) throw new ApiError(`Company ${uuid} was not found.`, 404);
    company.status = "VERIFIED";
    saveDb(db);
    return company;
  },
};
