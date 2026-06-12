import { PrismaClient } from '@prisma/client';

// Єдиний Prisma-клієнт на процес. У dev Next перезавантажує модулі — щоб не
// плодити з'єднання, тримаємо інстанс на globalThis (стандартний патерн Prisma+Next).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
