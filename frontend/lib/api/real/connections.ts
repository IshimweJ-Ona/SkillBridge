import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { ConnectionState, Paginated, PeerCard } from "../types";

const base = API_BASES.identity;

export const connectionsApi = {
  directory: (params: { search?: string; page?: number; limit?: number } = {}) =>
    apiFetch<Paginated<PeerCard>>(base, "/connections/directory", { query: params }),

  getProfile: (uuid: string) => apiFetch<PeerCard>(base, `/connections/directory/${uuid}`),

  listMine: () => apiFetch<PeerCard[]>(base, "/connections"),

  pendingRequests: () => apiFetch<PeerCard[]>(base, "/connections/requests"),

  requestConnection: (uuid: string) =>
    apiFetch<{ connectionState: ConnectionState }>(base, `/connections/${uuid}`, { method: "POST" }),

  acceptRequest: (uuid: string) =>
    apiFetch<{ connectionState: ConnectionState }>(base, `/connections/${uuid}/accept`, { method: "POST" }),

  removeConnection: (uuid: string) =>
    apiFetch<{ connectionState: ConnectionState }>(base, `/connections/${uuid}`, { method: "DELETE" }),
};
