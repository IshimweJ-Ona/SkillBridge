// One-off ops script - run with `npx ts-node create-employer.ts` from
// backend/, pointed at whichever DATABASE_URL you want to write to. Add as
// many entries to EMPLOYERS as you need; existing emails are skipped, never
// overwritten. Each entry also claims (or creates) a Company by name, so this
// pairs with prisma/seed.prod.ts's 4 real companies - run that first and
// these accounts become the real logins for Andela/Zipline/Ampersand/Bank of
// Kigali, the same companies already attributed to the Learning Hub
// challenges.
import { CompanyStatus, PrismaClient, Role, SubscriptionPlan, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMPLOYERS = [
  {
    email: 'hr@andela.com',
    password: 'Employer@123',
    firstName: 'Aline',
    lastName: 'Mukamana',
    companyName: 'Andela',
    companyDomain: 'andela.com',
    sector: 'Software Development',
    location: 'Kigali, Rwanda',
    description: 'A global talent network connecting African tech talent with remote engineering roles.',
  },
  {
    email: 'hr@flyzipline.com',
    password: 'Employer@123',
    firstName: 'Eric',
    lastName: 'Nsengimana',
    companyName: 'Zipline',
    companyDomain: 'flyzipline.com',
    sector: 'Logistics',
    location: 'Muhanga, Rwanda',
    description: 'Drone logistics company delivering medical supplies across Rwanda and beyond.',
  },
  {
    email: 'hr@ampersand.co',
    password: 'Employer@123',
    firstName: 'Grace',
    lastName: 'Ingabire',
    companyName: 'Ampersand',
    companyDomain: 'ampersand.co',
    sector: 'Clean Energy',
    location: 'Kigali, Rwanda',
    description: "East Africa's leading electric motorcycle company, building local manufacturing and battery-swap infrastructure.",
  },
  {
    email: 'hr@bk.rw',
    password: 'Employer@123',
    firstName: 'Patrick',
    lastName: 'Niyonzima',
    companyName: 'Bank of Kigali',
    companyDomain: 'bk.rw',
    sector: 'Financial Services',
    location: 'Kigali, Rwanda',
    description: "Rwanda's largest commercial bank, offering retail, corporate, and digital banking services.",
  },
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
