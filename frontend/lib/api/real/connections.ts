import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { Paginated, PeerCard } from "../types";

const base = API_BASES.identity;

export const connectionsApi = {
  directory: (params: { search?: string; page?: number; limit?: number } = {}) =>
    apiFetch<Paginated<PeerCard>>(base, "/connections/directory", { query: params }),

  getProfile: (uuid: string) => apiFetch<PeerCard>(base, `/connections/directory/${uuid}`),

  listMine: () => apiFetch<PeerCard[]>(base, "/connections"),

  connect: (uuid: string) => apiFetch<{ connected: boolean }>(base, `/connections/${uuid}`, { method: "POST" }),

  disconnect: (uuid: string) =>
    apiFetch<{ connected: boolean }>(base, `/connections/${uuid}`, { method: "DELETE" }),
};
