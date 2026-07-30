// One-off ops script - run with `npx ts-node create-employer.ts` from
// backend/, pointed at whichever DATABASE_URL you want to write to. Fill in
// real entries locally before running (never commit real emails/passwords
// here - this file must stay empty in git). Existing emails are skipped,
// never overwritten. Each entry also claims (or creates) a Company by name.
import { CompanyStatus, PrismaClient, Role, SubscriptionPlan, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMPLOYERS: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companyDomain: string;
  sector: string;
  location: string;
  description: string;
}[] = [
  // {
  //   email: 'hr@example.com',
  //   password: 'ChangeMe@123',
  //   firstName: 'First',
  //   lastName: 'Last',
  //   companyName: 'Example Co',
  //   companyDomain: 'example.com',
  //   sector: 'Software Development',
  //   location: 'Kigali, Rwanda',
  //   description: 'What this company does.',
  // },
];

async function main() {
  for (const entry of EMPLOYERS) {
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
        role: Role.EMPLOYER,
        status: UserStatus.ACTIVE,
        consentVersion: 'v1.0',
        consentAcceptedAt: new Date(),
        consents: {
          create: { version: 'v1.0', purpose: 'SkillBridge account registration and platform services' },
        },
        subscription: { create: { plan: SubscriptionPlan.EMPLOYER_PARTNER, priceCents: 4900 } },
      },
    });

    const company = await prisma.company.findFirst({ where: { name: entry.companyName } });
    if (company) {
      await prisma.company.update({ where: { id: company.id }, data: { ownerUserId: user.id } });
      console.log(`Created EMPLOYER account: ${user.email} (uuid ${user.uuid}), now owns existing company "${entry.companyName}".`);
    } else {
      const created = await prisma.company.create({
        data: {
          ownerUserId: user.id,
          name: entry.companyName,
          description: entry.description,
          sector: entry.sector,
          location: entry.location,
          website: `https://${entry.companyDomain}`,
          logoUrl: `https://logo.clearbit.com/${entry.companyDomain}`,
          status: CompanyStatus.VERIFIED,
        },
      });
      console.log(`Created EMPLOYER account: ${user.email} (uuid ${user.uuid}), with new company "${created.name}".`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
