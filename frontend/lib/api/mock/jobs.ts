import {
  ApiError,
  type ApplicationStatus,
  type JobApplication,
  type JobMatch,
  type JobPosting,
  type JobStatus,
  type Paginated,
  type SkillChallenge,
} from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

export const jobsApiMock = {
  async list(query?: { search?: string; page?: number; limit?: number }): Promise<Paginated<JobPosting>> {
    await mockLatency();
    const db = getDb();
    const search = query?.search?.toLowerCase().trim();
    const items = db.jobs.filter((job) => {
      // Matches the real backend's listJobs default: DRAFT jobs (e.g. a
      // pending pre-screen test awaiting admin approval) never show up here.
      if (job.status !== "OPEN") return false;
      if (!search) return true;
      return (
        job.title.toLowerCase().includes(search) ||
        job.requiredSkills.some((skill) => skill.toLowerCase().includes(search)) ||
        job.location?.toLowerCase().includes(search)
      );
    });
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
    };
  },

  async get(uuid: string): Promise<JobPosting> {
    await mockLatency();
    const db = getDb();
    const job = db.jobs.find((candidate) => candidate.uuid === uuid);
    if (!job) throw new ApiError(`Job ${uuid} was not found.`, 404);
    return job;
  },

  async myMatches(): Promise<JobMatch[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return db.jobMatches
      .filter((match) => match.userUuid === user.uuid && match.job.status === "OPEN")
      .sort((a, b) => b.score - a.score);
  },

  async apply(uuid: string, body: { coverLetter?: string; documentUrl?: string }): Promise<JobApplication> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const job = db.jobs.find((candidate) => candidate.uuid === uuid);
    if (!job) throw new ApiError(`Job ${uuid} was not found.`, 404);

    if (db.applications.some((app) => app.userUuid === user.uuid && app.job.uuid === uuid)) {
      throw new ApiError("You already applied to this job.", 409);
    }

    const match = db.jobMatches.find((candidate) => candidate.userUuid === user.uuid && candidate.job.uuid === uuid);
    const application = {
      uuid: crypto.randomUUID(),
      status: "SUBMITTED" as const,
      coverLetter: body.coverLetter ?? null,
      documentUrl: body.documentUrl ?? null,
      matchScore: match?.score ?? null,
      submittedAt: new Date().toISOString(),
      job,
      userUuid: user.uuid,
      user: {
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        location: user.location,
        profile: user.profile,
      },
    };

    db.applications.unshift(application);
    db.notifications.unshift({
      uuid: crypto.randomUUID(),
      type: "APPLICATION_STATUS",
      channel: "IN_APP",
      subject: `Application received: ${job.title}`,
      body: `Your application for ${job.title} at ${job.company.name} was submitted successfully.`,
      status: "SENT",
      readAt: null,
      createdAt: new Date().toISOString(),
      userUuid: user.uuid,
    });
    saveDb(db);

    return application;
  },

  // Mirrors the real backend's role-aware scoping in jobs.service.ts#listApplications:
  // youth see only their own applications, employers see applications on
  // their own companies' jobs, admins would see everything (not modeled yet).
  async myApplications(): Promise<JobApplication[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);

    const items =
      user.role === "EMPLOYER"
        ? db.applications.filter((app) => db.companyOwners[app.job.company.uuid] === user.uuid)
        : db.applications.filter((app) => app.userUuid === user.uuid);

    return items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  async myJobs(): Promise<JobPosting[]> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    return db.jobs
      .filter((job) => db.companyOwners[job.company.uuid] === user.uuid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createJob(
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
      preScreenGoogleFormUrl?: string;
      responseSheetUrl?: string;
    },
  ): Promise<JobPosting> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const company = db.companies.find((candidate) => candidate.uuid === companyUuid);
    if (!company) throw new ApiError(`Company ${companyUuid} was not found.`, 404);
    if (db.companyOwners[companyUuid] !== user.uuid) {
      throw new ApiError("You do not have permission to manage this company.", 403);
    }
    if (company.status !== "VERIFIED") {
      throw new ApiError("Company must be verified before posting jobs.", 400);
    }

    let preScreenChallenge: SkillChallenge | undefined;
    let status = body.status ?? "OPEN";

    if (body.preScreenGoogleFormUrl) {
      // Mirrors jobs.service.ts#createJob: a raw employer-submitted link
      // never goes live directly - staged as DRAFT until admin approves it
      // with the real AutoProctor link via approvePreScreen() below.
      preScreenChallenge = {
        uuid: crypto.randomUUID(),
        title: `${body.title} - Pre-Screening Test`,
        description: "Complete the linked test, then submit here to finish this job's pre-screening.",
        sector: "Professional Skills",
        skillCategory: body.requiredSkills?.[0] ?? "General",
        difficulty: "BEGINNER",
        audience: "ALL_YOUTH",
        durationMinutes: 30,
        passingScore: 70,
        status: "DRAFT",
        resources: [
          { type: "pending_autoproctor", label: "Pending AutoProctor processing", url: body.preScreenGoogleFormUrl },
          ...(body.responseSheetUrl
            ? [{ type: "response_sheet", label: "Applicant responses & scores", url: body.responseSheetUrl }]
            : []),
        ],
        createdAt: new Date().toISOString(),
        company,
      };
      db.challenges.unshift(preScreenChallenge);
      status = "DRAFT";
    } else if (body.preScreenChallengeUuid) {
      preScreenChallenge = db.challenges.find((candidate) => candidate.uuid === body.preScreenChallengeUuid);
    }

    const job: JobPosting = {
      uuid: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      requiredSkills: body.requiredSkills ?? [],
      compensationRange: body.compensationRange ?? null,
      location: body.location ?? null,
      deadline: body.deadline ?? null,
      status,
      createdAt: new Date().toISOString(),
      company,
      preScreenChallenge: preScreenChallenge
        ? {
            uuid: preScreenChallenge.uuid,
            title: preScreenChallenge.title,
            skillCategory: preScreenChallenge.skillCategory,
            resources: preScreenChallenge.resources,
          }
        : null,
    };

    db.jobs.unshift(job);
    saveDb(db);
    return job;
  },

  // Admin-only below.
  async listPendingPreScreen(): Promise<JobPosting[]> {
    await mockLatency();
    const db = getDb();
    return db.jobs.filter(
      (job) =>
        job.status === "DRAFT" &&
        job.preScreenChallenge?.resources?.some((resource) => resource.type === "pending_autoproctor"),
    );
  },

  async approvePreScreen(uuid: string, autoProctorUrl: string): Promise<JobPosting> {
    await mockLatency();
    const db = getDb();
    const job = db.jobs.find((candidate) => candidate.uuid === uuid);
    if (!job) throw new ApiError(`Job ${uuid} was not found.`, 404);
    if (!job.preScreenChallenge) {
      throw new ApiError("This job has no pre-screening test pending approval.", 400);
    }

    const challenge = db.challenges.find((candidate) => candidate.uuid === job.preScreenChallenge!.uuid);
    if (challenge) {
      const responseSheet = challenge.resources?.find((r) => r.type === "response_sheet");
      challenge.status = "PUBLISHED";
      challenge.resources = [
        { type: "external_test", label: `Open the ${challenge.skillCategory} test`, url: autoProctorUrl },
        ...(responseSheet ? [responseSheet] : []),
      ];
      job.preScreenChallenge.resources = challenge.resources;
    }

    job.status = "OPEN";
    saveDb(db);
    return job;
  },

  async updateApplicationStatus(uuid: string, status: ApplicationStatus): Promise<JobApplication> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const application = db.applications.find((candidate) => candidate.uuid === uuid);
    if (!application) throw new ApiError(`Application ${uuid} was not found.`, 404);
    if (db.companyOwners[application.job.company.uuid] !== user.uuid) {
      throw new ApiError("You do not have permission to manage this application.", 403);
    }

    application.status = status;
    db.notifications.unshift({
      uuid: crypto.randomUUID(),
      type: "APPLICATION_STATUS",
      channel: "IN_APP",
      subject: `Application update: ${application.job.title}`,
      body: `Your application for ${application.job.title} at ${application.job.company.name} is now ${status.replace("_", " ").toLowerCase()}.`,
      status: "SENT",
      readAt: null,
      createdAt: new Date().toISOString(),
      userUuid: application.userUuid,
    });
    saveDb(db);

    return application;
  },
};
