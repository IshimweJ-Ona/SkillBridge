import type { Feedback, FeedbackSummary, Paginated } from "../types";
import { getDb, mockLatency } from "./store";

export const feedbackApiMock = {
  async list(query?: { page?: number; limit?: number }): Promise<Paginated<Feedback>> {
    await mockLatency();
    const db = getDb();
    const items = [...db.feedbackItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
    };
  },

  async summary(): Promise<FeedbackSummary> {
    await mockLatency();
    const db = getDb();
    const items = db.feedbackItems;
    const ratings = items.filter((f) => typeof f.rating === "number").map((f) => f.rating as number);
    const audiences: Feedback["audience"][] = ["YOUTH", "EMPLOYER", "PARTNER"];

    return {
      total: items.length,
      new: items.filter((f) => f.status === "NEW").length,
      inReview: items.filter((f) => f.status === "IN_REVIEW").length,
      actioned: items.filter((f) => f.status === "ACTIONED").length,
      archived: items.filter((f) => f.status === "ARCHIVED").length,
      averageRating: ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0,
      byAudience: audiences.map((audience) => ({
        audience,
        count: items.filter((f) => f.audience === audience).length,
      })),
    };
  },
};
