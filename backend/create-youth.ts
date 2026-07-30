// One-off ops script - run with `npx ts-node create-youth.ts` from backend/,
// pointed at whichever DATABASE_URL you want to write to. Add as many entries
// to YOUTH as you need; existing emails are skipped, never overwritten. Each
// account also gets a PUBLIC profile so it shows up on the Connect directory
// and in job applications right away.
import { PrismaClient, Role, UserStatus, Visibility } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const YOUTH = [
  {
    email: 'youth1@example.com',
    password: 'SkillBridge@123',
    firstName: 'Eric',
    lastName: 'Habimana',
    location: 'Kigali, Rwanda',
    headline: 'Backend Developer',
    skills: ['Node.js', 'PostgreSQL', 'Python'],
  },
];

async function main() {
  for (const entry of YOUTH) {
    const existing = await prisma.user.findUnique({ where: { email: entry.email } });
    if (existing) {
      console.log(`Skipping ${entry.email} - already exists (role: ${existing.role}).`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: entry.email,
        passwordHash: bcrypt.hashSync(entry.password, 12),
        firstName: entry.firstName,
        lastName: entry.lastName,
        location: entry.location,
        role: Role.YOUTH_USER,
        status: UserStatus.ACTIVE,
        consentVersion: 'v1.0',
        consentAcceptedAt: new Date(),
        consents: {
          create: { version: 'v1.0', purpose: 'SkillBridge account registration and platform services' },
        },
        subscription: { create: { plan: 'FREE', priceCents: 0 } },
        profile: {
          create: {
            headline: entry.headline,
            location: entry.location,
            skills: entry.skills,
            visibility: Visibility.PUBLIC,
          },
        },
      },
    });

    console.log(`Created YOUTH_USER account: ${user.email} (uuid ${user.uuid})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
