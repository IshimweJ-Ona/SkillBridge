// PRODUCTION seed - unlike prisma/seed.ts (local dev only, creates fake demo
// user accounts), this script creates zero user accounts. It only adds:
//   - 4 real, verified companies (for demo browsing / job-posting demos),
//     with real logos fetched via the Clearbit Logo API (a public,
//     unauthenticated service that returns a company's real logo given its
//     domain - not a fabricated image)
//   - 3 real, publicly-visible multiple-choice skill tests real signed-up
//     users can take under Learning Hub to earn a verified badge, each
//     attributed to one of the 4 seeded companies (not a generic
//     "SkillBridge Academy") so the demo reads as real companies testing
//     real skills. Graded in-app - see backend/src/challenges/challenges.service.ts.
// Safe to run against the live Neon database, and safe to re-run: companies
// are looked up by name first (never duplicated), and challenges are looked
// up by title first - if a challenge already exists, only its company
// attribution is corrected (never its questions, in case an employer has
// since edited them through the real Create Skill Test UI).
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

type SeedQuestion = {
  id: string;
  prompt: string;
  options: string[];
  // Index (as a string) of the correct option in `options`.
  answer: string;
};

type SeedChallenge = {
  title: string;
  description: string;
  sector: string;
  skillCategory: string;
  difficulty: ChallengeDifficulty;
  durationMinutes: number;
  passingScore: number;
  companyName: string;
  questions: SeedQuestion[];
};

const challenges: SeedChallenge[] = [
  {
    title: 'Python Fundamentals Challenge',
    description:
      'A multiple-choice test covering Python basics: syntax, functions, data types, and operators. Answer every question and submit to see your score instantly.',
    sector: 'Software Development',
    skillCategory: 'Python',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 20,
    passingScore: 70,
    companyName: 'Andela',
    questions: [
      { id: 'py-1', prompt: 'What is the correct file extension for Python files?', options: ['.py', '.python', '.pt', '.pyt'], answer: '0' },
      { id: 'py-2', prompt: 'Which keyword is used to define a function in Python?', options: ['func', 'def', 'function', 'lambda'], answer: '1' },
      { id: 'py-3', prompt: "What is the output of print(2 ** 3)?", options: ['6', '8', '9', '23'], answer: '1' },
      { id: 'py-4', prompt: 'Which data type is immutable in Python?', options: ['list', 'dict', 'tuple', 'set'], answer: '2' },
      { id: 'py-5', prompt: 'How do you start a single-line comment in Python?', options: ['//', '#', '/* */', '--'], answer: '1' },
      { id: 'py-6', prompt: 'What does len([1, 2, 3]) return?', options: ['2', '3', '4', 'Error'], answer: '1' },
      { id: 'py-7', prompt: 'Which operator correctly checks equality in Python?', options: ['=', '==', 'eq()', 'equals()'], answer: '1' },
      { id: 'py-8', prompt: "What does type(5.0) return?", options: ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'double'>"], answer: '1' },
    ],
  },
  {
    title: 'SQL Fundamentals Challenge',
    description:
      'A multiple-choice test covering SQL basics: SELECT/JOIN queries, filtering, and aggregation. Answer every question and submit to see your score instantly.',
    sector: 'Data',
    skillCategory: 'SQL',
    difficulty: ChallengeDifficulty.INTERMEDIATE,
    durationMinutes: 25,
    passingScore: 70,
    companyName: 'Bank of Kigali',
    questions: [
      { id: 'sql-1', prompt: 'Which SQL keyword is used to retrieve data from a database?', options: ['GET', 'SELECT', 'FETCH', 'RETRIEVE'], answer: '1' },
      { id: 'sql-2', prompt: 'Which clause is used to filter rows in SQL?', options: ['WHERE', 'FILTER', 'HAVING', 'IF'], answer: '0' },
      { id: 'sql-3', prompt: 'Which JOIN returns only matching rows from both tables?', options: ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN'], answer: '2' },
      { id: 'sql-4', prompt: 'Which function counts the number of rows in a result set?', options: ['SUM()', 'COUNT()', 'TOTAL()', 'ROWS()'], answer: '1' },
      { id: 'sql-5', prompt: 'Which clause groups rows sharing a common value?', options: ['GROUP BY', 'ORDER BY', 'SORT BY', 'CLUSTER BY'], answer: '0' },
      { id: 'sql-6', prompt: 'Which keyword removes duplicate rows from a result?', options: ['UNIQUE', 'DISTINCT', 'NO_DUPES', 'FILTER'], answer: '1' },
      { id: 'sql-7', prompt: 'Which statement is used to add new rows to a table?', options: ['ADD', 'INSERT INTO', 'NEW ROW', 'APPEND'], answer: '1' },
      { id: 'sql-8', prompt: 'Which clause filters groups after a GROUP BY?', options: ['WHERE', 'HAVING', 'FILTER', 'GROUP FILTER'], answer: '1' },
    ],
  },
  {
    title: 'Management Fundamentals Challenge',
    description:
      'A non-technical multiple-choice test covering prioritization, delegation, feedback, and team leadership. Answer every question and submit to see your score instantly.',
    sector: 'Professional Skills',
    skillCategory: 'Management',
    difficulty: ChallengeDifficulty.BEGINNER,
    durationMinutes: 15,
    passingScore: 70,
    companyName: 'Zipline',
    questions: [
      { id: 'mgmt-1', prompt: 'What is the primary purpose of delegation in management?', options: ["To reduce a manager's workload only", 'To develop team members and distribute work effectively', 'To avoid accountability', 'To micromanage staff'], answer: '1' },
      { id: 'mgmt-2', prompt: 'Which of these is a SMART goal characteristic?', options: ['Simple', 'Measurable', 'Mysterious', 'Manual'], answer: '1' },
      { id: 'mgmt-3', prompt: 'What is the best first step when giving constructive feedback?', options: ['Criticize in front of the team', 'Focus on specific, observable behavior', 'Compare the person to a coworker', 'Wait until the annual review'], answer: '1' },
      { id: 'mgmt-4', prompt: 'Active listening primarily involves:', options: ['Waiting for your turn to speak', 'Interrupting to clarify quickly', 'Giving full attention and confirming understanding', 'Only listening to senior staff'], answer: '2' },
      { id: 'mgmt-5', prompt: 'What best describes a priority matrix (urgent/important)?', options: ['A tool to rank tasks by urgency and importance', 'A schedule for meetings only', 'A performance review template', 'A budgeting spreadsheet'], answer: '0' },
      { id: 'mgmt-6', prompt: 'Which leadership style involves the most team input in decisions?', options: ['Autocratic', 'Democratic/participative', 'Laissez-faire', 'Bureaucratic'], answer: '1' },
      { id: 'mgmt-7', prompt: 'What is a key benefit of regular one-on-one meetings with team members?', options: ['They replace the need for performance reviews', 'They build trust and surface issues early', 'They are only useful for new hires', 'They reduce the need for feedback'], answer: '1' },
      { id: 'mgmt-8', prompt: 'When resolving conflict between two team members, a manager should first:', options: ['Take one side immediately', 'Ignore it and hope it resolves itself', 'Understand both perspectives before acting', 'Escalate to HR immediately'], answer: '2' },
    ],
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
        questions: item.questions,
        resources: [],
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
