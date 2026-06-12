// Разовий скрип: скинути пароль акаунта (email+password) через хешер Better Auth.
// Запуск: npx tsx scripts/reset-password.ts <email> <new-password>
import { auth } from '../lib/auth';
import { prisma } from '../lib/db';

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Вжиток: tsx scripts/reset-password.ts <email> <password>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Користувача ${email} не знайдено`);
    process.exit(1);
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
  });

  if (account) {
    await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
  } else {
    await prisma.account.create({
      data: { userId: user.id, providerId: 'credential', accountId: user.id, password: hash },
    });
  }

  console.log(`Пароль для ${email} оновлено.`);
  process.exit(0);
}

main();
