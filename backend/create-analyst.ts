// One-off ops script - run with `npx ts-node create-analyst.ts` from backend/,
// pointed at whichever DATABASE_URL you want to write to. Fill in real
// entries locally before running (never commit real emails/passwords here -
// this file must stay empty in git). Existing emails are skipped, never
// overwritten.
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ANALYSTS: { email: string; password: string; firstName: string; lastName: string }[] = [
  // { email: 'name@example.com', password: 'ChangeMe@123', firstName: 'First', lastName: 'Last' },
];

async function main() {
  for (const entry of ANALYSTS) {
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
        role: Role.ANALYST,
        status: UserStatus.ACTIVE,
        consentVersion: 'v1.0',
        consentAcceptedAt: new Date(),
        consents: {
          create: { version: 'v1.0', purpose: 'SkillBridge account registration and platform services' },
        },
        subscription: { create: { plan: 'FREE', priceCents: 0 } },
      },
    });

    console.log(`Created ANALYST account: ${user.email} (uuid ${user.uuid})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
