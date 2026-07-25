import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { ChallengeSubmission, Paginated, SkillBadge, SkillChallenge } from "../types";

const base = API_BASES.learning;

export const challengesApi = {
  list: (query?: { sector?: string; skillCategory?: string; search?: string; page?: number; limit?: number }) =>
    apiFetch<Paginated<SkillChallenge>>(base, "/challenges", { query }),

  get: (uuid: string) => apiFetch<SkillChallenge>(base, `/challenges/${uuid}`),

  start: (uuid: string) =>
    apiFetch<ChallengeSubmission>(base, `/challenges/${uuid}/start`, { method: "POST", body: {} }),

  autosave: (submissionUuid: string, body: { responseText?: string; responseUrl?: string }) =>
    apiFetch<ChallengeSubmission>(base, `/challenge-submissions/${submissionUuid}/autosave`, {
      method: "PATCH",
      body,
    }),

  submit: (submissionUuid: string, body: { responseText?: string; responseUrl?: string }) =>
    apiFetch<ChallengeSubmission>(base, `/challenge-submissions/${submissionUuid}/submit`, {
      method: "POST",
      body,
    }),

  myBadges: (userUuid: string) => apiFetch<SkillBadge[]>(base, `/badges/by-user/${userUuid}`),
};
