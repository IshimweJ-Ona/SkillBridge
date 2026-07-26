import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { Feedback, FeedbackSummary, Paginated } from "../types";

const base = API_BASES.identity;

export const feedbackApi = {
  list: (query?: { page?: number; limit?: number }) =>
    apiFetch<Paginated<Feedback>>(base, "/feedback", { query }),

  summary: () => apiFetch<FeedbackSummary>(base, "/feedback/stats/summary"),
};
