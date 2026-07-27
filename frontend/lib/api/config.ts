// SkillBridge backend runs as 6 separate NestJS services, each on its own
// port and owning a different subset of routes.

export const USE_MOCK_API =
  (process.env.NEXT_PUBLIC_USE_MOCK_API ?? "true").toLowerCase() !== "false";

export const API_BASES = {
  identity: process.env.NEXT_PUBLIC_IDENTITY_API_URL ?? "http://localhost:3101/api/v1",
  learning: process.env.NEXT_PUBLIC_LEARNING_API_URL ?? "http://localhost:3102/api/v1",
  matching: process.env.NEXT_PUBLIC_MATCHING_API_URL ?? "http://localhost:3103/api/v1",
  marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_API_URL ?? "http://localhost:3104/api/v1",
  admin: process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:3105/api/v1",
  messaging: process.env.NEXT_PUBLIC_MESSAGING_API_URL ?? "http://localhost:3106/api/v1",
} as const;

// The WebSocket notifications gateway is mounted identically in matching-api
// and admin-api; matching-api is the canonical host (job-match is its focus).
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? API_BASES.matching.replace(/\/api\/v1$/, "");
