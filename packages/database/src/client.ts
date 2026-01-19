import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Prisma 7: Use Driver Adapter for database connection
const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });

// Prevent multiple instances of Prisma Client in development
export const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { PrismaClient };
