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
      // Raw employer-submitted Google Form link - stages the job (and its
      // pre-screen challenge) as DRAFT/hidden until an admin approves it via
      // approvePreScreen() with the real AutoProctor link.
      preScreenGoogleFormUrl?: string;
      // Google Sheet the employer linked their Form's responses to (records
      // each applicant's email/name/score) - SkillBridge never reads this
      // automatically, it's for the employer/admin to check manually.
      responseSheetUrl?: string;
    },
  ) => apiFetch<JobPosting>(base, `/companies/${companyUuid}/jobs`, { method: "POST", body }),

  updateApplicationStatus: (uuid: string, status: ApplicationStatus) =>
    apiFetch<JobApplication>(base, `/applications/${uuid}/status`, { method: "PATCH", body: { status } }),

  // Admin-only below.
  listPendingPreScreen: () => apiFetch<JobPosting[]>(base, "/jobs/pending-pre-screen"),

  approvePreScreen: (uuid: string, autoProctorUrl: string) =>
    apiFetch<JobPosting>(base, `/jobs/${uuid}/approve-pre-screen`, { method: "PATCH", body: { autoProctorUrl } }),
};
