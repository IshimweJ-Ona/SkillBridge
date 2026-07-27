import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { ApplicationStatus, JobApplication, JobMatch, JobPosting, JobStatus, Paginated } from "../types";

const base = API_BASES.matching;

export const jobsApi = {
  list: (query?: { search?: string; page?: number; limit?: number }) =>
    apiFetch<Paginated<JobPosting>>(base, "/jobs", { query }),

  get: (uuid: string) => apiFetch<JobPosting>(base, `/jobs/${uuid}`),

  myMatches: () => apiFetch<JobMatch[]>(base, "/jobs/matches/me"),

  // Same signature/behavior for every role: the backend scopes the result
  // to youth's own applications, an employer's own companies' applications,
  // or (for admins) everything - see jobs.service.ts#listApplications.
  myApplications: () => apiFetch<JobApplication[]>(base, "/applications"),

  apply: (uuid: string, body: { coverLetter?: string; documentUrl?: string }) =>
    apiFetch<JobApplication>(base, `/jobs/${uuid}/applications`, { method: "POST", body }),

  // Employer-only below.
  myJobs: () => apiFetch<JobPosting[]>(base, "/jobs/mine"),

  createJob: (
    companyUuid: string,
    body: {
      title: string;
      description: string;
      requiredSkills?: string[];
      compensationRange?: string;
      location?: string;
      deadline?: string;
      status?: JobStatus;
      preScreenChallengeUuid?: string;
    },
  ) => apiFetch<JobPosting>(base, `/companies/${companyUuid}/jobs`, { method: "POST", body }),

  updateApplicationStatus: (uuid: string, status: ApplicationStatus) =>
    apiFetch<JobApplication>(base, `/applications/${uuid}/status`, { method: "PATCH", body: { status } }),
};
