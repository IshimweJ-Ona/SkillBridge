import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { Company, Paginated } from "../types";

const base = API_BASES.matching;

export const companiesApi = {
  create: (body: {
    name: string;
    description?: string;
    sector?: string;
    location?: string;
    website?: string;
    logoUrl?: string;
  }) => apiFetch<Company>(base, "/companies", { method: "POST", body }),

  mine: () => apiFetch<Company[]>(base, "/companies/mine"),

  // Administrator-only below.
  pendingVerification: () => apiFetch<Paginated<Company>>(base, "/companies", { query: { status: "PENDING_VERIFICATION" } }),

  verify: (uuid: string) => apiFetch<Company>(base, `/companies/${uuid}/verify`, { method: "PATCH", body: {} }),
};
