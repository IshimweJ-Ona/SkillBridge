import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { ChallengeResource, ChallengeSubmission, Paginated, SkillBadge, SkillChallenge } from "../types";

const base = API_BASES.learning;

// The create-time shape of a question - includes the correct answer, unlike
// the read-time ChallengeQuestion type the test-taker sees (see types.ts).
export interface ChallengeQuestionInput {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  points?: number;
}

export const challengesApi = {
  list: (query?: {
    sector?: string;
    skillCategory?: string;
    search?: string;
    companyUuid?: string;
    page?: number;
    limit?: number;
  }) => apiFetch<Paginated<SkillChallenge>>(base, "/challenges", { query }),

  get: (uuid: string) => apiFetch<SkillChallenge>(base, `/challenges/${uuid}`),

  // Employer-only. Two shapes share this one endpoint: a job pre-screen
  // (Google Form link via `resources`, reviewed by an admin before it's
  // public - see app/employer/jobs/new) and a Learning Hub skill test
  // (in-app multiple-choice `questions`, published immediately, no admin
  // review - see app/employer/skill-tests/new).
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
      questions?: ChallengeQuestionInput[];
    },
  ) => apiFetch<SkillChallenge>(base, `/companies/${companyUuid}/challenges`, { method: "POST", body }),

  start: (uuid: string) =>
    apiFetch<ChallengeSubmission>(base, `/challenges/${uuid}/start`, { method: "POST", body: {} }),

  autosave: (submissionUuid: string, body: { responseText?: string; responseUrl?: string; responses?: Record<string, string> }) =>
    apiFetch<ChallengeSubmission>(base, `/challenge-submissions/${submissionUuid}/autosave`, {
      method: "PATCH",
      body,
    }),

  submit: (submissionUuid: string, body: { responseText?: string; responseUrl?: string; responses?: Record<string, string> }) =>
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
