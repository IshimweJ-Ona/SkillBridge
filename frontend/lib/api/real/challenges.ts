import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { ChallengeResource, ChallengeSubmission, Paginated, SkillBadge, SkillChallenge } from "../types";

const base = API_BASES.learning;

export const challengesApi = {
  list: (query?: { sector?: string; skillCategory?: string; search?: string; page?: number; limit?: number }) =>
    apiFetch<Paginated<SkillChallenge>>(base, "/challenges", { query }),

  get: (uuid: string) => apiFetch<SkillChallenge>(base, `/challenges/${uuid}`),

  // Employer-only - used to attach a pre-screening test (e.g. a Google Form
  // link, via `resources`) to a job posting. See app/employer/jobs/new.
  create: (
    companyUuid: string,
    body: {
      title: string;
      description: string;
      sector: string;
      skillCategory: string;
      difficulty?: string;
      durationMinutes?: number;
      passingScore?: number;
      status?: string;
      resources?: ChallengeResource[];
    },
  ) => apiFetch<SkillChallenge>(base, `/companies/${companyUuid}/challenges`, { method: "POST", body }),

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

  // Called the instant the browser tab hosting a timed test loses focus -
  // auto-fails the attempt and locks retries for 7 days server-side.
  failIntegrity: (submissionUuid: string) =>
    apiFetch<ChallengeSubmission>(base, `/challenge-submissions/${submissionUuid}/fail-integrity`, {
      method: "PATCH",
      body: {},
    }),

  myBadges: (userUuid: string) => apiFetch<SkillBadge[]>(base, `/badges/by-user/${userUuid}`),
};
