// PRODUCTION seed - unlike prisma/seed.ts (local dev only, creates fake demo
// users/accounts), this script creates zero user accounts. It only adds
// real, publicly-visible skill challenges that real signed-up users can see
// and complete under "Learning Hub" to earn a verified badge. Safe to run
// against the live Neon database, and safe to re-run (each challenge is
// looked up by title first, so re-running never creates duplicates).
//
// Run with: npx ts-node prisma/seed.prod.ts   (see backend/README.md /
// DEPLOYMENT.md for the exact production command)
import { ChallengeAudience, ChallengeDifficulty, ChallengeStatus, CompanyStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLATFORM_COMPANY_NAME = 'SkillBridge Academy';

// Each `googleFormUrl` is a placeholder - replace with the real published
// Google Form link before running this script. See the quiz content drafted
// alongside this script for what to put in each form.
type SeedChallenge = {
  title: string;
  description: string;
  sector: string;
  skillCategory: string;
  difficulty: ChallengeDifficulty;
  durationMinutes: number;
  passingScore: number;
  googleFormUrl: string;
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
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_PYTHON_FORM_LINK',
  },
  {
    title: 'JavaScript Essentials Challenge',
    description:
      'Test your core JavaScript knowledge: variables, functions, arrays/objects, DOM basics, and asynchronous code. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Software Development',
    skillCategory: 'JavaScript',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 30,
    passingScore: 70,
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_JAVASCRIPT_FORM_LINK',
  },
  {
    title: 'CSS Styling Challenge',
    description:
      'Test your understanding of CSS layout, the box model, flexbox/grid, and responsive design fundamentals. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Web Design',
    skillCategory: 'CSS',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 25,
    passingScore: 70,
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_CSS_FORM_LINK',
  },
  {
    title: 'HTML Fundamentals Challenge',
    description:
      'Test your understanding of semantic HTML, forms, accessibility basics, and document structure. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Web Design',
    skillCategory: 'HTML',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 20,
    passingScore: 70,
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_HTML_FORM_LINK',
  },
  {
    title: 'MySQL Database Challenge',
    description:
      'Test your SQL fundamentals: SELECT/JOIN queries, filtering, aggregation, and basic schema design. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Data',
    skillCategory: 'MySQL',
    difficulty: ChallengeDifficulty.INTERMEDIATE,
    durationMinutes: 35,
    passingScore: 70,
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_MYSQL_FORM_LINK',
  },
  {
    title: 'Workplace Communication Challenge',
    description:
      'A non-technical challenge covering professional email writing, active listening, and giving/receiving feedback - core skills for any entry-level role. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Professional Skills',
    skillCategory: 'Communication',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 20,
    passingScore: 70,
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_COMMUNICATION_FORM_LINK',
  },
  {
    title: 'Problem-Solving & Critical Thinking Challenge',
    description:
      'A non-technical challenge covering workplace scenario reasoning, prioritization, and structured problem-solving - useful across every job sector. Complete the linked test, then submit here to finish the challenge.',
    sector: 'Professional Skills',
    skillCategory: 'Problem Solving',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 20,
    passingScore: 70,
    googleFormUrl: 'https://forms.gle/REPLACE_WITH_PROBLEM_SOLVING_FORM_LINK',
  },
];

async function main() {
  let company = await prisma.company.findFirst({ where: { name: PLATFORM_COMPANY_NAME } });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: PLATFORM_COMPANY_NAME,
        description: 'SkillBridge\'s own skill-verification challenges, open to every youth user.',
        sector: 'Education',
        status: CompanyStatus.VERIFIED,
      },
    });
    console.log(`Created platform company "${PLATFORM_COMPANY_NAME}" (id ${company.id}).`);
  } else {
    console.log(`Using existing platform company "${PLATFORM_COMPANY_NAME}" (id ${company.id}).`);
  }

  for (const item of challenges) {
    const existing = await prisma.skillChallenge.findFirst({ where: { title: item.title } });

    if (existing) {
      console.log(`Skipping "${item.title}" - already exists (id ${existing.id}).`);
      continue;
    }

    const created = await prisma.skillChallenge.create({
      data: {
        companyId: company.id,
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
            url: item.googleFormUrl,
          },
        ],
      },
    });
    console.log(`Created challenge "${created.title}" (id ${created.id}).`);
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
