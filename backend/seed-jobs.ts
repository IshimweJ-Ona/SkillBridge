// One-off ops script - run with `npx ts-node seed-jobs.ts` from backend/,
// pointed at whichever DATABASE_URL you want to write to. Creates 3 real,
// realistic job postings for each of the 4 companies from
// prisma/seed.prod.ts (run that + create-employer.ts first). Posted OPEN
// with no pre-screen test attached - pre-screen tests are a manual, live
// demo step (employer submits a Google Form link, admin secures it via
// AutoProctor) using the content in docs/job-prescreen-questions.md.
// Safe to re-run: looks up by title + company first, never duplicates.
import { JobStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedJob = {
  companyName: string;
  title: string;
  description: string;
  requiredSkills: string[];
  compensationRange: string;
  location: string;
};

const JOBS: SeedJob[] = [
  {
    companyName: 'Andela',
    title: 'Junior Frontend Developer (React)',
    description:
      'Join our engineering team to build responsive, accessible web interfaces for clients across Africa and beyond. You will work closely with senior engineers on real production features using React, TypeScript, and modern tooling.',
    requiredSkills: ['React.js', 'JavaScript', 'HTML/CSS', 'Git'],
    compensationRange: '$700 - $1,100',
    location: 'Kigali, Rwanda (Hybrid)',
  },
  {
    companyName: 'Andela',
    title: 'Backend Developer (Node.js / PostgreSQL)',
    description:
      'Design and build reliable REST APIs and services powering our talent marketplace. You will own database schema design, write clean, tested code, and collaborate with frontend engineers on API contracts.',
    requiredSkills: ['Node.js', 'PostgreSQL', 'REST APIs', 'TypeScript'],
    compensationRange: '$900 - $1,400',
    location: 'Kigali, Rwanda (Hybrid)',
  },
  {
    companyName: 'Andela',
    title: 'QA / Test Engineer',
    description:
      'Own the quality bar for our engineering team: write automated test suites, perform manual exploratory testing, and work with developers to catch regressions before they reach production.',
    requiredSkills: ['Manual Testing', 'Test Automation', 'Bug Tracking', 'Attention to Detail'],
    compensationRange: '$650 - $1,000',
    location: 'Remote',
  },
  {
    companyName: 'Zipline',
    title: 'Drone Operations Technician',
    description:
      'Support daily drone delivery operations at our distribution center: pre-flight checks, routine maintenance, and safe launch/recovery of delivery drones carrying medical supplies to health facilities.',
    requiredSkills: ['Attention to Detail', 'Mechanical Aptitude', 'Safety Procedures'],
    compensationRange: '$500 - $800',
    location: 'Muhanga, Rwanda',
  },
  {
    companyName: 'Zipline',
    title: 'Supply Chain Coordinator',
    description:
      'Coordinate inventory and delivery scheduling across our distribution network, working with health facility partners to ensure medical supplies arrive where and when they are needed.',
    requiredSkills: ['Inventory Management', 'Excel', 'Communication', 'Problem Solving'],
    compensationRange: '$600 - $950',
    location: 'Muhanga, Rwanda',
  },
  {
    companyName: 'Zipline',
    title: 'Field Logistics Associate',
    description:
      'Be the on-the-ground link between our distribution center and health facility partners: confirm deliveries, maintain accurate records, and troubleshoot delivery issues in real time.',
    requiredSkills: ['Communication', 'Record Keeping', 'Problem Solving'],
    compensationRange: '$450 - $700',
    location: 'Muhanga, Rwanda',
  },
  {
    companyName: 'Ampersand',
    title: 'Battery Systems Technician',
    description:
      'Inspect, test, and maintain lithium-ion battery packs at our battery-swap stations. You will follow strict safety procedures while keeping our electric motorcycle fleet powered and ready.',
    requiredSkills: ['Electrical Safety', 'Battery Systems', 'Attention to Detail'],
    compensationRange: '$550 - $900',
    location: 'Kigali, Rwanda',
  },
  {
    companyName: 'Ampersand',
    title: 'Electric Motorcycle Assembly Technician',
    description:
      'Assemble electric motorcycles on our production line to strict quality and safety standards, following standardized checklists and torque specifications for every build.',
    requiredSkills: ['Mechanical Assembly', 'Quality Control', 'Attention to Detail'],
    compensationRange: '$500 - $850',
    location: 'Kigali, Rwanda',
  },
  {
    companyName: 'Ampersand',
    title: 'Customer Support Associate (EV Fleet)',
    description:
      'Support our electric motorcycle riders with charging, maintenance, and battery-swap questions via phone and chat, escalating safety-related issues immediately per protocol.',
    requiredSkills: ['Customer Service', 'Communication', 'Problem Solving'],
    compensationRange: '$450 - $750',
    location: 'Kigali, Rwanda',
  },
  {
    companyName: 'Bank of Kigali',
    title: 'Junior Data Analyst',
    description:
      'Support our analytics team by cleaning data, building dashboards, and surfacing insights on customer behavior and product performance across our retail banking division.',
    requiredSkills: ['Excel', 'SQL', 'Data Visualization', 'Attention to Detail'],
    compensationRange: '$700 - $1,100',
    location: 'Kigali, Rwanda',
  },
  {
    companyName: 'Bank of Kigali',
    title: 'Customer Service Representative',
    description:
      'Be the first point of contact for our retail banking customers - answering account questions, resolving issues, and ensuring every interaction reflects our commitment to service excellence.',
    requiredSkills: ['Customer Service', 'Communication', 'Confidentiality'],
    compensationRange: '$450 - $700',
    location: 'Kigali, Rwanda',
  },
  {
    companyName: 'Bank of Kigali',
    title: 'IT Support Officer',
    description:
      'Provide first- and second-line technical support to bank staff across hardware, software, and network issues, while following strict security and access-control procedures.',
    requiredSkills: ['IT Support', 'Troubleshooting', 'Security Awareness'],
    compensationRange: '$600 - $950',
    location: 'Kigali, Rwanda',
  },
];

async function main() {
  for (const job of JOBS) {
    const company = await prisma.company.findFirst({ where: { name: job.companyName } });
    if (!company) {
      console.log(`Skipping "${job.title}" - company "${job.companyName}" was not found. Run prisma/seed.prod.ts first.`);
      continue;
    }

    const existing = await prisma.jobPosting.findFirst({ where: { title: job.title, companyId: company.id } });
    if (existing) {
      console.log(`Skipping "${job.title}" at ${job.companyName} - already exists.`);
      continue;
    }

    await prisma.jobPosting.create({
      data: {
        companyId: company.id,
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        compensationRange: job.compensationRange,
        location: job.location,
        status: JobStatus.OPEN,
      },
    });
    console.log(`Created job "${job.title}" at ${job.companyName}.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
