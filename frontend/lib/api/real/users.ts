import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { AdminUser, Paginated, UserStatus, UsersSummary } from "../types";

// UsersController is administrator-only and lives on identity-api.
const base = API_BASES.identity;

export const usersApi = {
  list: (query?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) =>
    apiFetch<Paginated<AdminUser>>(base, "/users", { query }),

  summary: () => apiFetch<UsersSummary>(base, "/users/stats/summary"),

  updateStatus: (uuid: string, status: UserStatus) =>
    apiFetch<AdminUser>(base, `/users/${uuid}/status`, { method: "PATCH", body: { status } }),
};
