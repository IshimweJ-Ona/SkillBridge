import {
  ChallengeAudience,
  ChallengeDifficulty,
  ChallengeStatus,
  CompanyStatus,
  ContractStatus,
  FeedbackAudience,
  FeedbackStatus,
  JobStatus,
  ListingStatus,
  Prisma,
  PrismaClient,
  PricingType,
  ServiceRequestStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
  TransactionStatus,
  TransactionType,
  UserStatus,
  Visibility,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const demoPassword = 'SkillBridge@123';

type SeedProfile = {
  headline: string;
  bio: string;
  location: string;
  skills: string[];
  careerInterests: string[];
  languages: string[];
  educationLevel: string;
  portfolioUrl?: string;
  cvUrl?: string;
  visibility: Visibility;
  verifiedBadgeCount: number;
  endorsementCount: number;
};

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  status: UserStatus;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    priceCents: number;
    currency: string;
  };
  profile: SeedProfile;
};

type SeedFeedback = {
  userEmail?: string;
  audience: FeedbackAudience;
  status: FeedbackStatus;
  rating: number;
  subject: string;
  message: string;
  contactName: string;
  contactEmail: string;
  organizationName?: string;
  source: string;
  tags: string[];
  internalNotes?: string;
};

type ScoreProfile = {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[];
  careerInterests?: string[];
  languages?: string[];
  educationLevel?: string | null;
  portfolioUrl?: string | null;
  cvUrl?: string | null;
  verifiedBadgeCount?: number;
  endorsementCount?: number;
};

const users: SeedUser[] = [
  {
    email: 'aline.youth@skillbridge.rw',
    firstName: 'Aline',
    lastName: 'Mukamana',
    phone: '+250788100001',
    role: Role.YOUTH_USER,
    status: UserStatus.ACTIVE,
    subscription: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      priceCents: 0,
      currency: 'USD',
    },
    profile: {
      headline: 'Junior web developer focused on accessible frontend interfaces',
      bio: 'Aline is building practical React, HTML, CSS, and communication skills while preparing for entry-level digital roles.',
      location: 'Kigali, Rwanda',
      skills: ['React', 'HTML', 'CSS', 'Customer support'],
      careerInterests: ['Frontend development', 'Digital support'],
      languages: ['Kinyarwanda', 'English', 'French'],
      educationLevel: 'Secondary school graduate',
      portfolioUrl: 'https://example.com/aline-portfolio',
      cvUrl: 'https://example.com/aline-cv.pdf',
      visibility: Visibility.PUBLIC,
      verifiedBadgeCount: 2,
      endorsementCount: 3,
    },
  },
  {
    email: 'eric.employer@skillbridge.rw',
    firstName: 'Eric',
    lastName: 'Ndayisenga',
    phone: '+250788100002',
    role: Role.EMPLOYER,
    status: UserStatus.ACTIVE,
    subscription: {
      plan: SubscriptionPlan.EMPLOYER_PARTNER,
      status: SubscriptionStatus.ACTIVE,
      priceCents: 4900,
      currency: 'USD',
    },
    profile: {
      headline: 'Talent partner for entry-level technology roles',
      bio: 'Eric helps partner companies identify verified young talent for junior support and operations roles.',
      location: 'Kigali, Rwanda',
      skills: ['Hiring', 'Talent screening', 'Partnerships'],
      careerInterests: ['Youth employment', 'Employer partnerships'],
      languages: ['Kinyarwanda', 'English'],
      educationLevel: 'Bachelor degree',
      portfolioUrl: 'https://example.com/company',
      visibility: Visibility.EMPLOYERS_ONLY,
      verifiedBadgeCount: 1,
      endorsementCount: 2,
    },
  },
  {
    email: 'admin@skillbridge.rw',
    firstName: 'Jonathan',
    lastName: 'Ishimwe',
    phone: '+250788100003',
    role: Role.ADMINISTRATOR,
    status: UserStatus.ACTIVE,
    subscription: {
      plan: SubscriptionPlan.EMPLOYER_PARTNER,
      status: SubscriptionStatus.TRIALING,
      priceCents: 0,
      currency: 'USD',
    },
    profile: {
      headline: 'SkillBridge platform administrator',
      bio: 'Jonathan manages user access, profile quality, and platform setup for the SkillBridge pilot.',
      location: 'Kigali, Rwanda',
      skills: ['Platform administration', 'Prisma', 'NestJS'],
      careerInterests: ['EdTech operations', 'Youth employability'],
      languages: ['Kinyarwanda', 'English', 'French'],
      educationLevel: 'University student',
      visibility: Visibility.PRIVATE,
      verifiedBadgeCount: 0,
      endorsementCount: 1,
    },
  },
  {
    email: 'analyst@skillbridge.rw',
    firstName: 'Grace',
    lastName: 'Uwase',
    phone: '+250788100004',
    role: Role.ANALYST,
    status: UserStatus.PENDING_VERIFICATION,
    subscription: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      priceCents: 0,
      currency: 'USD',
    },
    profile: {
      headline: 'Read-only analyst for employability reporting',
      bio: 'Grace reviews anonymized platform activity and prepares reports for employment outcome analysis.',
      location: 'Kigali, Rwanda',
      skills: ['Reporting', 'Data analysis', 'Dashboard review'],
      careerInterests: ['Employment analytics', 'Skills reporting'],
      languages: ['Kinyarwanda', 'English'],
      educationLevel: 'Bachelor degree',
      visibility: Visibility.PRIVATE,
      verifiedBadgeCount: 0,
      endorsementCount: 0,
    },
  },
];

const feedbackItems: SeedFeedback[] = [
  {
    userEmail: 'aline.youth@skillbridge.rw',
    audience: FeedbackAudience.YOUTH,
    status: FeedbackStatus.NEW,
    rating: 4,
    subject: 'Youth onboarding feedback',
    message:
      'The profile flow is simple to follow. I would like clearer guidance on which skills are most valuable for first digital jobs.',
    contactName: 'Aline Mukamana',
    contactEmail: 'aline.youth@skillbridge.rw',
    source: 'seed',
    tags: ['youth', 'onboarding'],
  },
  {
    userEmail: 'eric.employer@skillbridge.rw',
    audience: FeedbackAudience.EMPLOYER,
    status: FeedbackStatus.IN_REVIEW,
    rating: 5,
    subject: 'Employer pilot feedback',
    message:
      'The verified profile scores are useful for shortlisting. Employers will need a quick way to filter candidates by role readiness and language.',
    contactName: 'Eric Ndayisenga',
    contactEmail: 'eric.employer@skillbridge.rw',
    organizationName: 'Kigali Talent Partners',
    source: 'seed',
    tags: ['employer', 'pilot'],
    internalNotes: 'Good candidate for a follow-up client interview.',
  },
];

function calculateCompleteness(profile: ScoreProfile) {
  const checks = [
    Boolean(profile.headline),
    Boolean(profile.bio),
    Boolean(profile.location),
    Boolean(profile.educationLevel),
    Boolean(profile.portfolioUrl || profile.cvUrl),
    Boolean(profile.skills?.length),
    Boolean(profile.careerInterests?.length),
    Boolean(profile.languages?.length),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calculateBrandScore(profile: ScoreProfile) {
  const profileCompleteness = calculateCompleteness(profile);
  const badgeScore = Math.min((profile.verifiedBadgeCount ?? 0) * 20, 100);
  const endorsementScore = Math.min((profile.endorsementCount ?? 0) * 20, 100);

  return Math.round(
    profileCompleteness * 0.25 + badgeScore * 0.7 + endorsementScore * 0.05,
  );
}

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
}

async function main() {
  const seedUserEmails = users.map((user) => user.email);
  const seedCompanyNames = [
    'Kigali Talent Partners',
    'Rwanda Digital Works',
    'Huye Creative Lab',
  ];
  const seedChallengeTitles = [
    'Frontend fundamentals challenge',
    'Data cleaning essentials challenge',
    'Creative client brief challenge',
  ];
  const passwordHash = hashPassword(demoPassword);

  for (const user of users) {
    const profileCompleteness = calculateCompleteness(user.profile);
    const brandScore = calculateBrandScore(user.profile);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        subscription: {
          upsert: {
            create: user.subscription,
            update: user.subscription,
          },
        },
        profile: {
          upsert: {
            create: {
              ...user.profile,
              profileCompleteness,
              brandScore,
            },
            update: {
              ...user.profile,
              profileCompleteness,
              brandScore,
            },
          },
        },
      },
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        subscription: {
          create: user.subscription,
        },
        profile: {
          create: {
            ...user.profile,
            profileCompleteness,
            brandScore,
          },
        },
      },
    });
  }

  await prisma.$executeRaw`
    UPDATE "users"
    SET "uuid" = gen_random_uuid()
    WHERE "email" IN (${Prisma.join(seedUserEmails)})
      AND "uuid"::text LIKE '11111111-%'
  `;

  await prisma.$executeRaw`
    UPDATE "profiles"
    SET "uuid" = gen_random_uuid()
    WHERE "userId" IN (
      SELECT "id" FROM "users" WHERE "email" IN (${Prisma.join(seedUserEmails)})
    )
      AND "uuid"::text LIKE '21111111-%'
  `;

  await prisma.feedback.deleteMany({
    where: { source: 'seed' },
  });

  const seededUsers = await prisma.user.findMany({
    where: { email: { in: users.map((user) => user.email) } },
    select: { id: true, email: true },
  });
  const usersByEmail = new Map(
    seededUsers.map((user) => [user.email, user.id] as const),
  );

  for (const feedback of feedbackItems) {
    const { userEmail, ...feedbackData } = feedback;
    const userId = userEmail ? usersByEmail.get(userEmail) : undefined;

    if (userEmail && !userId) {
      throw new Error(`Seed user ${userEmail} was not found.`);
    }

    await prisma.feedback.create({
      data: {
        ...feedbackData,
        userId,
      },
    });
  }

  await prisma.transaction.deleteMany({
    where: {
      OR: [
        { providerReference: { startsWith: 'seed-' } },
        { metadata: { path: ['seed'], equals: true } },
      ],
    },
  });
  await prisma.freelanceReview.deleteMany({
    where: { listing: { title: 'Responsive portfolio website setup' } },
  });
  await prisma.serviceContract.deleteMany({
    where: { listing: { title: 'Responsive portfolio website setup' } },
  });
  await prisma.serviceRequest.deleteMany({
    where: { listing: { title: 'Responsive portfolio website setup' } },
  });
  await prisma.freelanceListing.deleteMany({
    where: { title: 'Responsive portfolio website setup' },
  });
  await prisma.jobMatch.deleteMany({
    where: { job: { title: 'Junior Frontend Support Associate' } },
  });
  await prisma.jobApplication.deleteMany({
    where: { job: { title: 'Junior Frontend Support Associate' } },
  });
  await prisma.jobPosting.deleteMany({
    where: { title: 'Junior Frontend Support Associate' },
  });
  await prisma.skillBadge.deleteMany({
    where: { skillName: 'Frontend fundamentals' },
  });
  await prisma.challengeSubmission.deleteMany({
    where: { challenge: { title: { in: seedChallengeTitles } } },
  });
  await prisma.skillChallenge.deleteMany({
    where: { title: { in: seedChallengeTitles } },
  });
  await prisma.company.deleteMany({
    where: { name: { in: seedCompanyNames } },
  });

  const seededUserRecords = await prisma.user.findMany({
    where: { email: { in: users.map((user) => user.email) } },
    include: { subscription: true, profile: true },
  });
  const seededByEmail = new Map(
    seededUserRecords.map((user) => [user.email, user] as const),
  );
  const employer = seededByEmail.get('eric.employer@skillbridge.rw');
  const youth = seededByEmail.get('aline.youth@skillbridge.rw');

  if (!employer || !youth) {
    throw new Error('Required seed users were not created.');
  }

  const seedPartners = [
    {
      name: 'Kigali Talent Partners',
      description: 'Seed employer partner for youth placement pilots.',
      sector: 'Technology and digital services',
      location: 'Kigali, Rwanda',
      website: 'https://example.com/kigali-talent',
      logoUrl: 'https://example.com/kigali-talent-logo.png',
    },
    {
      name: 'Rwanda Digital Works',
      description: 'Verified partner focused on data operations and junior analyst roles.',
      sector: 'Data and operations',
      location: 'Musanze, Rwanda',
      website: 'https://example.com/rwanda-digital-works',
      logoUrl: 'https://example.com/rwanda-digital-works-logo.png',
    },
    {
      name: 'Huye Creative Lab',
      description: 'Verified partner for design, content, and freelance client projects.',
      sector: 'Creative services',
      location: 'Huye, Rwanda',
      website: 'https://example.com/huye-creative-lab',
      logoUrl: 'https://example.com/huye-creative-lab-logo.png',
    },
  ];
  const partnerRecords = [];

  for (const partner of seedPartners) {
    partnerRecords.push(
      await prisma.company.create({
        data: {
          ownerUserId: employer.id,
          verifiedByUserId: seededByEmail.get('admin@skillbridge.rw')?.id,
          ...partner,
          status: CompanyStatus.VERIFIED,
        },
      }),
    );
  }

  const company = partnerRecords[0];

  const challenge = await prisma.skillChallenge.create({
    data: {
      companyId: company.id,
      title: 'Frontend fundamentals challenge',
      description: 'A timed objective challenge covering accessible HTML, CSS, and React basics.',
      sector: 'Technology',
      skillCategory: 'Frontend fundamentals',
      difficulty: ChallengeDifficulty.BEGINNER,
      audience: ChallengeAudience.ALL_YOUTH,
      durationMinutes: 60,
      passingScore: 70,
      status: ChallengeStatus.PUBLISHED,
      questions: [
        {
          id: 'q1',
          prompt: 'Which HTML element should wrap primary page navigation?',
          answer: 'nav',
          points: 1,
        },
        {
          id: 'q2',
          prompt: 'Which React hook manages local component state?',
          answer: 'useState',
          points: 1,
        },
      ],
      resources: [
        {
          title: 'MDN HTML semantic elements',
          url: 'https://developer.mozilla.org/',
        },
      ],
    },
  });

  await prisma.skillChallenge.createMany({
    data: [
      {
        companyId: partnerRecords[1].id,
        title: 'Data cleaning essentials challenge',
        description: 'A timed objective challenge for spreadsheet cleanup and basic data quality checks.',
        sector: 'Data and operations',
        skillCategory: 'Data cleaning',
        difficulty: ChallengeDifficulty.BEGINNER,
        audience: ChallengeAudience.ALL_YOUTH,
        durationMinutes: 75,
        passingScore: 70,
        status: ChallengeStatus.PUBLISHED,
        questions: [
          {
            id: 'q1',
            prompt: 'What should duplicate customer rows be before analysis?',
            answer: 'removed',
            points: 1,
          },
        ],
        resources: [
          {
            title: 'Google Sheets data cleanup guide',
            url: 'https://support.google.com/docs/',
          },
        ],
      },
      {
        companyId: partnerRecords[2].id,
        title: 'Creative client brief challenge',
        description: 'A subjective challenge for interpreting a client brief and proposing deliverables.',
        sector: 'Creative services',
        skillCategory: 'Client communication',
        difficulty: ChallengeDifficulty.INTERMEDIATE,
        audience: ChallengeAudience.UNIVERSITY_GRADUATES,
        durationMinutes: 90,
        passingScore: 70,
        status: ChallengeStatus.PUBLISHED,
        questions: [
          {
            id: 'brief',
            prompt: 'Write a concise response to a client requesting a brand refresh.',
            points: 10,
          },
        ],
        resources: [
          {
            title: 'Coursera client communication resources',
            url: 'https://www.coursera.org/',
          },
        ],
      },
    ],
  });

  const submission = await prisma.challengeSubmission.create({
    data: {
      challengeId: challenge.id,
      userId: youth.id,
      status: 'GRADED',
      responses: { q1: 'nav', q2: 'useState' },
      score: 100,
      feedback: { earned: 2, total: 2, resources: [] },
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
  });

  await prisma.skillBadge.create({
    data: {
      userId: youth.id,
      challengeId: challenge.id,
      companyId: company.id,
      submissionId: submission.id,
      name: 'Frontend fundamentals Verified Badge',
      skillName: 'Frontend fundamentals',
      score: 100,
      verifyUrl: 'http://localhost:3102/api/v1/badges/verify/seed',
    },
  });

  if (youth.profile) {
    const verifiedBadgeCount = await prisma.skillBadge.count({
      where: { userId: youth.id, status: 'ISSUED' },
    });
    await prisma.profile.update({
      where: { id: youth.profile.id },
      data: {
        verifiedBadgeCount,
        brandScore: calculateBrandScore({
          ...youth.profile,
          verifiedBadgeCount,
        }),
      },
    });
  }

  const job = await prisma.jobPosting.create({
    data: {
      companyId: company.id,
      preScreenChallengeId: challenge.id,
      title: 'Junior Frontend Support Associate',
      description: 'Support partner teams with responsive page updates and user support workflows.',
      requiredSkills: ['Frontend fundamentals', 'Customer support'],
      compensationRange: '300,000 - 450,000 RWF monthly',
      location: 'Kigali, Rwanda',
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: JobStatus.OPEN,
    },
  });

  await prisma.jobMatch.create({
    data: {
      jobId: job.id,
      userId: youth.id,
      score: 91,
      badgeScore: 100,
      brandScore: 70,
      subscribed: youth.subscription?.plan !== SubscriptionPlan.FREE,
      notificationDueAt: new Date(),
      notifiedAt: new Date(),
    },
  });

  await prisma.jobApplication.create({
    data: {
      jobId: job.id,
      userId: youth.id,
      status: 'SUBMITTED',
      coverLetter: 'I am interested in applying my frontend and support skills.',
      matchScore: 91,
    },
  });

  const listing = await prisma.freelanceListing.create({
    data: {
      userId: youth.id,
      title: 'Responsive portfolio website setup',
      description: 'Build a simple responsive portfolio landing page for students or small teams.',
      category: 'Web design',
      pricingType: PricingType.FIXED,
      priceCents: 7500000,
      currency: 'RWF',
      timelineDays: 5,
      portfolioUrls: ['https://example.com/aline-portfolio'],
      status: ListingStatus.ACTIVE,
    },
  });

  const request = await prisma.serviceRequest.create({
    data: {
      listingId: listing.id,
      clientUserId: employer.id,
      requirements: 'Create a clean one-page site for a student club.',
      status: ServiceRequestStatus.CONTRACTED,
    },
  });

  const contract = await prisma.serviceContract.create({
    data: {
      listingId: listing.id,
      requestId: request.id,
      freelancerId: youth.id,
      clientUserId: employer.id,
      terms: 'One responsive landing page with portfolio sections.',
      deliverables: 'Source files and deployed preview link.',
      timelineDays: 5,
      feeCents: 7500000,
      currency: 'RWF',
      status: ContractStatus.ACTIVE,
      acceptedAt: new Date(),
    },
  });

  await prisma.transaction.create({
    data: {
      contractId: contract.id,
      userId: employer.id,
      type: TransactionType.FREELANCE_ESCROW,
      status: TransactionStatus.PENDING,
      amountCents: 7500000,
      currency: 'RWF',
      provider: 'stripe-demo',
      providerReference: 'seed-marketplace-escrow',
      metadata: { seed: true },
    },
  });

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      profile: true,
      subscription: true,
      feedback: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  console.log(
    `Seed complete. Database now has ${allUsers.length} user record(s).`,
  );
  console.log(`Demo login password for seeded users: ${demoPassword}`);
  console.dir(
    allUsers.map(({ passwordHash: _passwordHash, ...user }) => user),
    { depth: null, colors: true },
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
