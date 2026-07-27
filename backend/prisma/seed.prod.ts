// PRODUCTION seed - unlike prisma/seed.ts (local dev only, creates fake demo
// user accounts), this script creates zero user accounts. It only adds:
//   - 4 real, verified companies (for demo browsing / job-posting demos),
//     with real logos fetched via the Clearbit Logo API (a public,
//     unauthenticated service that returns a company's real logo given its
//     domain - not a fabricated image)
//   - real, publicly-visible skill challenges real signed-up users can see
//     and complete under "Learning Hub" to earn a verified badge, each
//     attributed to one of the 4 seeded companies (not a generic
//     "SkillBridge Academy") so the demo reads as real companies testing
//     real skills
// Safe to run against the live Neon database, and safe to re-run: companies
// are looked up by name first (never duplicated), and challenges are looked
// up by title first - if a challenge already exists, only its company
// attribution is corrected (never its resources/status, in case an admin
// has already approved a real AutoProctor link for it).
//
// Run with: npx ts-node prisma/seed.prod.ts   (see backend/README.md /
// DEPLOYMENT.md for the exact production command)
import { ChallengeAudience, ChallengeDifficulty, ChallengeStatus, CompanyStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real companies, real domains - logoUrl is fetched live from Clearbit's
// public logo API (https://logo.clearbit.com/{domain}) at request time by
// whatever renders it, not downloaded/hardcoded here as a file.
type SeedCompany = {
  name: string;
  domain: string;
  description: string;
  sector: string;
  location: string;
};

const companies: SeedCompany[] = [
  {
    name: 'Andela',
    domain: 'andela.com',
    description: 'A global talent network connecting African tech talent with remote engineering roles.',
    sector: 'Software Development',
    location: 'Kigali, Rwanda',
  },
  {
    name: 'Zipline',
    domain: 'flyzipline.com',
    description: 'Drone logistics company delivering medical supplies across Rwanda and beyond.',
    sector: 'Logistics',
    location: 'Muhanga, Rwanda',
  },
  {
    name: 'Ampersand',
    domain: 'ampersand.co',
    description: 'East Africa\'s leading electric motorcycle company, building local manufacturing and battery-swap infrastructure.',
    sector: 'Clean Energy',
    location: 'Kigali, Rwanda',
  },
  {
    name: 'Bank of Kigali',
    domain: 'bk.rw',
    description: 'Rwanda\'s largest commercial bank, offering retail, corporate, and digital banking services.',
    sector: 'Financial Services',
    location: 'Kigali, Rwanda',
  },
];

// `autoProctorUrl` is a placeholder - an admin gets the real one by pasting
// the raw test link into AutoProctor (see the questions given in chat for
// what to build each test from) and replacing the value here before running
// this script. This matches the same "admin holds the real proctored link"
// model used for employer-submitted job pre-screens.
type SeedChallenge = {
  title: string;
  description: string;
  sector: string;
  skillCategory: string;
  difficulty: ChallengeDifficulty;
  durationMinutes: number;
  passingScore: number;
  companyName: string;
  autoProctorUrl: string;
};

const challenges: SeedChallenge[] = [
  {
    title: 'Python Fundamentals Challenge',
    description:
      'Test your understanding of Python basics: variables, data types, control flow, functions, and simple data structures. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Software Development',
    skillCategory: 'Python',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 30,
    passingScore: 70,
    companyName: 'Andela',
    autoProctorUrl: 'https://autoproctor.co/REPLACE_WITH_PYTHON_TEST_LINK',
  },
  {
    title: 'SQL Fundamentals Challenge',
    description:
      'Test your SQL fundamentals: SELECT/JOIN queries, filtering, aggregation, and basic schema design. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Data',
    skillCategory: 'SQL',
    difficulty: ChallengeDifficulty.INTERMEDIATE,
    durationMinutes: 35,
    passingScore: 70,
    companyName: 'Bank of Kigali',
    autoProctorUrl: 'https://autoproctor.co/REPLACE_WITH_SQL_TEST_LINK',
  },
  {
    title: 'Management Fundamentals Challenge',
    description:
      'A non-technical challenge covering prioritization, delegation, feedback, and team leadership - core skills for any lead or supervisory role. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Professional Skills',
    skillCategory: 'Management',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 20,
    passingScore: 70,
    companyName: 'Zipline',
    autoProctorUrl: 'https://autoproctor.co/REPLACE_WITH_MANAGEMENT_TEST_LINK',
  },
];

async function main() {
  const companyIdByName = new Map<string, number>();

  for (const item of companies) {
    const existing = await prisma.company.findFirst({ where: { name: item.name } });

    if (existing) {
      companyIdByName.set(item.name, existing.id);
      console.log(`Using existing company "${item.name}" (id ${existing.id}).`);
      continue;
    }

    const created = await prisma.company.create({
      data: {
        name: item.name,
        description: item.description,
        sector: item.sector,
        location: item.location,
        website: `https://${item.domain}`,
        logoUrl: `https://logo.clearbit.com/${item.domain}`,
        status: CompanyStatus.VERIFIED,
      },
    });
    companyIdByName.set(item.name, created.id);
    console.log(`Created verified company "${created.name}" (id ${created.id}).`);
  }

  for (const item of challenges) {
    const companyId = companyIdByName.get(item.companyName);
    if (!companyId) {
      console.log(`Skipping challenge "${item.title}" - company "${item.companyName}" was not seeded.`);
      continue;
    }

    const existing = await prisma.skillChallenge.findFirst({ where: { title: item.title } });

    if (existing) {
      if (existing.companyId !== companyId) {
        await prisma.skillChallenge.update({ where: { id: existing.id }, data: { companyId } });
        console.log(`Updated challenge "${item.title}" (id ${existing.id}) to be owned by "${item.companyName}".`);
      } else {
        console.log(`Skipping challenge "${item.title}" - already exists (id ${existing.id}).`);
      }
      continue;
    }

    const created = await prisma.skillChallenge.create({
      data: {
        companyId,
        title: item.title,
        description: item.description,
        sector: item.sector,
        skillCategory: item.skillCategory,
        difficulty: item.difficulty,
        audience: ChallengeAudience.ALL_YOUTH,
        durationMinutes: item.durationMinutes,
        passingScore: item.passingScore,
        status: ChallengeStatus.PUBLISHED,
        questions: [],
        resources: [
          {
            type: 'external_test',
            label: `Open the ${item.skillCategory} test`,
            url: item.autoProctorUrl,
          },
        ],
      },
    });
    console.log(`Created challenge "${created.title}" (id ${created.id}), owned by "${item.companyName}".`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
