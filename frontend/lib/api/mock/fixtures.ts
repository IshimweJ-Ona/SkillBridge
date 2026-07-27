import type {
  AppNotification,
  AuditLogEntry,
  ChallengeSubmission,
  ChatMessage,
  Company,
  EarningsSummary,
  Feedback,
  FreelanceListing,
  JobApplication,
  JobMatch,
  JobPosting,
  MessageThread,
  Profile,
  ReportExport,
  ServiceContract,
  ServiceRequest,
  SkillBadge,
  SkillChallenge,
  Subscription,
  User,
} from "../types";

export interface MockUser extends User {
  password: string;
}

export interface MockDb {
  users: MockUser[];
  sessionUuid: string | null;
  pendingOtp: Record<string, string>;
  pendingReset: Record<string, string>;
  companies: Company[];
  /** Mock-only: maps a company uuid to the uuid of the employer who owns it (mirrors Company.ownerUserId server-side). */
  companyOwners: Record<string, string>;
  jobs: JobPosting[];
  jobMatches: (JobMatch & { userUuid: string })[];
  applications: (JobApplication & { userUuid: string })[];
  challenges: SkillChallenge[];
  submissions: (ChallengeSubmission & { userUuid: string })[];
  badges: (SkillBadge & { userUuid: string })[];
  notifications: (AppNotification & { userUuid: string })[];
  earnings: Record<string, EarningsSummary>;
  feedbackItems: Feedback[];
  reports: ReportExport[];
  auditLogs: AuditLogEntry[];
  listings: (FreelanceListing & { ownerUuid: string })[];
  serviceRequests: (ServiceRequest & { requesterUuid?: string })[];
  contracts: (ServiceContract & { freelancerUuid: string; clientUuid?: string })[];
  // Messaging starts empty for every account - no seeded/fake conversations.
  // Threads and messages are only ever created by real user action.
  messageThreads: MessageThread[];
  chatMessages: ChatMessage[];
}

const DEMO_YOUTH_UUID = "10000000-0000-4000-8000-000000000001";
const DEMO_EMPLOYER_UUID = "10000000-0000-4000-8000-000000000002";
const DEMO_ANALYST_UUID = "10000000-0000-4000-8000-000000000003";
const DEMO_ADMIN_UUID = "10000000-0000-4000-8000-000000000004";
const COMPANY_TECH_UUID = "20000000-0000-4000-8000-000000000001";
const COMPANY_CREATIVE_UUID = "20000000-0000-4000-8000-000000000002";
const COMPANY_STARTUP_UUID = "20000000-0000-4000-8000-000000000003";

function freeSubscription(): Subscription {
  return {
    uuid: crypto.randomUUID(),
    plan: "FREE",
    status: "ACTIVE",
    priceCents: 0,
    currency: "RWF",
    cancelAtPeriodEnd: false,
  };
}

function demoProfile(): Profile {
  return {
    uuid: "30000000-0000-4000-8000-000000000001",
    headline: "Frontend Developer",
    bio: "Passionate frontend developer with 2+ years of experience building modern, responsive web applications and solving complex problems.",
    location: "Kigali, Rwanda",
    skills: ["JavaScript", "React.js", "HTML/CSS", "Tailwind CSS", "Node.js"],
    careerInterests: ["Frontend Engineering", "UI/UX", "Web Performance"],
    languages: ["English", "Kinyarwanda"],
    educationLevel: "BSc Computer Science",
    portfolioUrl: "https://jonathan-ishimwe.dev",
    cvUrl: null,
    visibility: "PUBLIC",
    profileCompleteness: 85,
    verifiedBadgeCount: 3,
    endorsementCount: 4,
    brandScore: 85,
  };
}

function companies(): Company[] {
  return [
    {
      uuid: COMPANY_TECH_UUID,
      name: "Tech Solutions Ltd",
      description: "A Kigali-based software consultancy building products for East Africa.",
      sector: "Technology",
      location: "Kigali, Rwanda",
      website: "https://techsolutions.rw",
      logoUrl: null,
      status: "VERIFIED",
    },
    {
      uuid: COMPANY_CREATIVE_UUID,
      name: "Creative Agency",
      description: "Full-service digital design and branding studio.",
      sector: "Design",
      location: "Kigali, Rwanda",
      website: null,
      logoUrl: null,
      status: "VERIFIED",
    },
    {
      uuid: COMPANY_STARTUP_UUID,
      name: "Startup Rwanda",
      description: "Early-stage fintech startup hiring across engineering and growth.",
      sector: "Fintech",
      location: "Kigali, Rwanda",
      website: null,
      logoUrl: null,
      status: "VERIFIED",
    },
  ];
}

function jobs(comps: Company[]): JobPosting[] {
  const now = new Date().toISOString();
  const base: Array<Pick<JobPosting, "uuid" | "title" | "requiredSkills" | "compensationRange" | "location"> & { companyIdx: number }> = [
    {
      uuid: "40000000-0000-4000-8000-000000000001",
      title: "Frontend Developer",
      requiredSkills: ["JavaScript", "React.js", "HTML/CSS"],
      compensationRange: "$800 - $1200",
      location: "Kigali, Rwanda",
      companyIdx: 0,
    },
    {
      uuid: "40000000-0000-4000-8000-000000000002",
      title: "Full Stack Developer",
      requiredSkills: ["Node.js", "React.js", "PostgreSQL"],
      compensationRange: "$1000 - $1500",
      location: "Remote",
      companyIdx: 2,
    },
    {
      uuid: "40000000-0000-4000-8000-000000000003",
      title: "UI/UX Designer",
      requiredSkills: ["Figma", "UI/UX Design"],
      compensationRange: "$700 - $1000",
      location: "Kigali, Rwanda",
      companyIdx: 1,
    },
    {
      uuid: "40000000-0000-4000-8000-000000000004",
      title: "Mobile App Developer",
      requiredSkills: ["React Native", "TypeScript"],
      compensationRange: "$1000 - $1500",
      location: "Remote",
      companyIdx: 2,
    },
  ];

  return base.map((job) => ({
    uuid: job.uuid,
    title: job.title,
    description:
      "We are looking for a skilled candidate to join our team and help us build and support delightful, reliable applications.",
    requiredSkills: job.requiredSkills,
    compensationRange: job.compensationRange,
    location: job.location,
    deadline: null,
    status: "OPEN",
    createdAt: now,
    company: comps[job.companyIdx],
    preScreenChallenge: null,
  }));
}

function jobMatches(jobList: JobPosting[]): (JobMatch & { userUuid: string })[] {
  const scores = [93, 88, 85, 78];
  return jobList.map((job, index) => ({
    uuid: crypto.randomUUID(),
    score: scores[index] ?? 75,
    badgeScore: Math.min(100, (scores[index] ?? 75) + 5),
    brandScore: 85,
    subscribed: false,
    notificationDueAt: new Date().toISOString(),
    notifiedAt: new Date().toISOString(),
    job,
    userUuid: DEMO_YOUTH_UUID,
  }));
}

function applications(jobList: JobPosting[]): (JobApplication & { userUuid: string })[] {
  const statuses: JobApplication["status"][] = [
    "UNDER_REVIEW",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "SHORTLISTED",
  ];
  return jobList.map((job, index) => ({
    uuid: crypto.randomUUID(),
    status: statuses[index] ?? "SUBMITTED",
    coverLetter: "I'd love to bring my frontend skills to your team - see my portfolio and badges below.",
    documentUrl: null,
    matchScore: 85,
    submittedAt: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
    job,
    userUuid: DEMO_YOUTH_UUID,
    user: {
      uuid: DEMO_YOUTH_UUID,
      firstName: "Jonathan",
      lastName: "Ishimwe",
      email: "jonathan.ishimwe@example.com",
      phone: "+250781234567",
      location: "Kigali, Rwanda",
      profile: demoProfile(),
    },
  }));
}

function challenges(comps: Company[]): SkillChallenge[] {
  return [
    {
      uuid: "50000000-0000-4000-8000-000000000001",
      title: "React Fundamentals",
      description: "Build a small component-driven app to demonstrate core React skills: state, props, effects.",
      sector: "Technology",
      skillCategory: "React.js",
      difficulty: "INTERMEDIATE",
      audience: "ALL_YOUTH",
      durationMinutes: 90,
      passingScore: 70,
      status: "PUBLISHED",
      createdAt: new Date().toISOString(),
      company: comps[0],
    },
    {
      uuid: "50000000-0000-4000-8000-000000000002",
      title: "Advanced JavaScript",
      description: "Demonstrate mastery of closures, async/await, and array methods through short coding tasks.",
      sector: "Technology",
      skillCategory: "JavaScript",
      difficulty: "ADVANCED",
      audience: "ALL_YOUTH",
      durationMinutes: 60,
      passingScore: 70,
      status: "PUBLISHED",
      createdAt: new Date().toISOString(),
      company: comps[0],
    },
    {
      uuid: "50000000-0000-4000-8000-000000000003",
      title: "UI/UX Design Deep Dive",
      description: "Redesign a provided wireframe into a polished, accessible interface with a written rationale.",
      sector: "Design",
      skillCategory: "UI/UX Design",
      difficulty: "INTERMEDIATE",
      audience: "ALL_YOUTH",
      durationMinutes: 90,
      passingScore: 70,
      status: "PUBLISHED",
      createdAt: new Date().toISOString(),
      company: comps[1],
    },
    {
      uuid: "50000000-0000-4000-8000-000000000004",
      title: "Node.js APIs",
      description: "Design and implement a small REST API with validation and error handling.",
      sector: "Technology",
      skillCategory: "Node.js",
      difficulty: "INTERMEDIATE",
      audience: "ALL_YOUTH",
      durationMinutes: 90,
      passingScore: 70,
      status: "PUBLISHED",
      createdAt: new Date().toISOString(),
      company: comps[2],
    },
  ];
}

function badges(comps: Company[]): (SkillBadge & { userUuid: string })[] {
  return [
    {
      uuid: "60000000-0000-4000-8000-000000000001",
      name: "JavaScript Expert",
      skillName: "JavaScript",
      score: 92,
      status: "ISSUED",
      verifyUrl: "/badges/verify/60000000-0000-4000-8000-000000000001",
      issuedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      challenge: { title: "Advanced JavaScript" },
      company: comps[0],
      userUuid: DEMO_YOUTH_UUID,
    },
    {
      uuid: "60000000-0000-4000-8000-000000000002",
      name: "React Developer",
      skillName: "React.js",
      score: 88,
      status: "ISSUED",
      verifyUrl: "/badges/verify/60000000-0000-4000-8000-000000000002",
      issuedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      challenge: { title: "React Fundamentals" },
      company: comps[0],
      userUuid: DEMO_YOUTH_UUID,
    },
    {
      uuid: "60000000-0000-4000-8000-000000000003",
      name: "Problem Solver",
      skillName: "Problem Solving",
      score: 81,
      status: "ISSUED",
      verifyUrl: "/badges/verify/60000000-0000-4000-8000-000000000003",
      issuedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      challenge: { title: "Advanced JavaScript" },
      company: comps[2],
      userUuid: DEMO_YOUTH_UUID,
    },
  ];
}

function notifications(jobList: JobPosting[]): (AppNotification & { userUuid: string })[] {
  return [
    {
      uuid: crypto.randomUUID(),
      type: "APPLICATION_STATUS",
      channel: "IN_APP",
      subject: "Your application to Frontend Developer was viewed",
      body: `Tech Solutions Ltd viewed your application for ${jobList[0]?.title ?? "Frontend Developer"}.`,
      status: "SENT",
      readAt: null,
      createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      userUuid: DEMO_YOUTH_UUID,
    },
    {
      uuid: crypto.randomUUID(),
      type: "BADGE_EARNED",
      channel: "IN_APP",
      subject: "You earned a new badge",
      body: "You earned the JavaScript Expert badge.",
      status: "SENT",
      readAt: null,
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      userUuid: DEMO_YOUTH_UUID,
    },
    {
      uuid: crypto.randomUUID(),
      type: "JOB_MATCH",
      channel: "IN_APP",
      subject: "New SkillBridge job match",
      body: `You matched 93% for ${jobList[0]?.title ?? "Frontend Developer"} at Tech Solutions Ltd.`,
      status: "SENT",
      readAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      userUuid: DEMO_YOUTH_UUID,
    },
  ];
}

function feedbackSeed(): Feedback[] {
  return [
    {
      uuid: crypto.randomUUID(),
      audience: "YOUTH",
      status: "NEW",
      rating: 5,
      subject: "Loved the challenge library",
      message: "The React Fundamentals challenge was well designed and directly relevant to real job postings.",
      createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      user: { firstName: "Jonathan", lastName: "Ishimwe" },
    },
    {
      uuid: crypto.randomUUID(),
      audience: "EMPLOYER",
      status: "IN_REVIEW",
      rating: 4,
      subject: "Applicant quality is strong",
      message: "The badge-verified candidates we interviewed were well prepared. Would like more filtering options.",
      createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      user: { firstName: "Aline", lastName: "Mukamana" },
    },
    {
      uuid: crypto.randomUUID(),
      audience: "YOUTH",
      status: "ACTIONED",
      rating: 3,
      subject: "Mobile experience could be smoother",
      message: "Some forms are hard to fill out on a small screen, especially the challenge submission editor.",
      createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
      user: null,
      contactName: "Anonymous",
    },
  ];
}

function auditLogSeed(): AuditLogEntry[] {
  return [
    {
      uuid: crypto.randomUUID(),
      action: "STATUS_CHANGE",
      entityType: "JobApplication",
      details: { status: "SHORTLISTED" },
      createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      actor: { firstName: "Aline", lastName: "Mukamana", role: "EMPLOYER" },
    },
    {
      uuid: crypto.randomUUID(),
      action: "CREATE",
      entityType: "Company",
      details: { name: "Tech Solutions Ltd" },
      createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
      actor: { firstName: "Aline", lastName: "Mukamana", role: "EMPLOYER" },
    },
    {
      uuid: crypto.randomUUID(),
      action: "LOGIN",
      entityType: "User",
      details: {},
      createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      actor: { firstName: "Jonathan", lastName: "Ishimwe", role: "YOUTH_USER" },
    },
  ];
}

function listingsSeed(): (FreelanceListing & { ownerUuid: string })[] {
  return [
    {
      uuid: "70000000-0000-4000-8000-000000000001",
      title: "I will build a responsive React landing page",
      description: "Pixel-perfect, mobile-first landing pages built with React and Tailwind CSS. Includes 2 rounds of revisions.",
      category: "Web Development",
      pricingType: "FIXED",
      priceCents: 15000000,
      currency: "RWF",
      timelineDays: 5,
      portfolioUrls: [],
      status: "ACTIVE",
      createdAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      user: { uuid: DEMO_YOUTH_UUID, firstName: "Jonathan", lastName: "Ishimwe" },
      reviews: [],
      ownerUuid: DEMO_YOUTH_UUID,
    },
  ];
}

export function createSeedDb(): MockDb {
  const comps = companies();
  const jobList = jobs(comps);
  const challengeList = challenges(comps);

  const demoUser: MockUser = {
    uuid: DEMO_YOUTH_UUID,
    email: "jonathan.ishimwe@example.com",
    phone: "+250781234567",
    firstName: "Jonathan",
    lastName: "Ishimwe",
    location: "Kigali, Rwanda",
    role: "YOUTH_USER",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    profile: demoProfile(),
    subscription: freeSubscription(),
    password: "SkillBridge@123",
  };

  const demoEmployer: MockUser = {
    uuid: DEMO_EMPLOYER_UUID,
    email: "hr@techsolutions.rw",
    phone: "+250788000001",
    firstName: "Aline",
    lastName: "Mukamana",
    location: "Kigali, Rwanda",
    role: "EMPLOYER",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    profile: null,
    subscription: {
      uuid: crypto.randomUUID(),
      plan: "EMPLOYER_PARTNER",
      status: "ACTIVE",
      priceCents: 4900,
      currency: "RWF",
      cancelAtPeriodEnd: false,
    },
    password: "SkillBridge@123",
  };

  // Analyst/Administrator accounts are provisioned via invite, never
  // self-service signup (FR 2.1/2.6) - these represent pre-provisioned demo
  // accounts rather than something reachable through the sign-up flow.
  const demoAnalyst: MockUser = {
    uuid: DEMO_ANALYST_UUID,
    email: "analyst@skillbridge.rw",
    phone: null,
    firstName: "David",
    lastName: "Nkurunziza",
    location: "Kigali, Rwanda",
    role: "ANALYST",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    profile: null,
    subscription: null,
    password: "SkillBridge@123",
  };

  const demoAdmin: MockUser = {
    uuid: DEMO_ADMIN_UUID,
    email: "admin@skillbridge.rw",
    phone: null,
    firstName: "Sarah",
    lastName: "Uwimana",
    location: "Kigali, Rwanda",
    role: "ADMINISTRATOR",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 150 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    profile: null,
    subscription: null,
    password: "SkillBridge@123",
  };

  return {
    users: [demoUser, demoEmployer, demoAnalyst, demoAdmin],
    sessionUuid: null,
    pendingOtp: {},
    pendingReset: {},
    companies: comps,
    // The demo employer owns Tech Solutions Ltd, which already has a job
    // with real seeded applications - so signing in as the demo employer
    // shows a populated dashboard immediately, matching the Youth demo.
    companyOwners: { [COMPANY_TECH_UUID]: DEMO_EMPLOYER_UUID },
    jobs: jobList,
    jobMatches: jobMatches(jobList),
    applications: applications(jobList),
    challenges: challengeList,
    submissions: [],
    badges: badges(comps),
    notifications: notifications(jobList),
    earnings: {
      [DEMO_YOUTH_UUID]: {
        totalIncomeCents: 0,
        pendingEscrowCents: 0,
        contractCount: 0,
        transactions: [],
      },
    },
    feedbackItems: feedbackSeed(),
    reports: [],
    auditLogs: auditLogSeed(),
    listings: listingsSeed(),
    serviceRequests: [],
    contracts: [],
    messageThreads: [],
    chatMessages: [],
  };
}

export const DEMO_CREDENTIALS = {
  identifier: "jonathan.ishimwe@example.com",
  password: "SkillBridge@123",
};

export const DEMO_ANALYST_CREDENTIALS = {
  identifier: "analyst@skillbridge.rw",
  password: "SkillBridge@123",
};

export const DEMO_ADMIN_CREDENTIALS = {
  identifier: "admin@skillbridge.rw",
  password: "SkillBridge@123",
};

export const DEMO_EMPLOYER_CREDENTIALS = {
  identifier: "hr@techsolutions.rw",
  password: "SkillBridge@123",
};
