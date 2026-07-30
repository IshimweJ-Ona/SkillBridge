// One-off ops script - run with `npx ts-node delete-user.ts` from backend/,
// pointed at whichever DATABASE_URL you want to write to. Deletes accounts
// by email, any role. Add the emails you want removed locally before
// running (never commit real emails here - this file must stay empty in
// git). Missing emails are skipped, not an error.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAILS_TO_DELETE: string[] = [
  //'enter email here',
];

async function main() {
  for (const email of EMAILS_TO_DELETE) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Skipping ${email} - no account found.`);
      continue;
    }

    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Deleted ${email} (was role: ${user.role}).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
