import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

if (!process.env.DATABASE_URL) {
  dotenv.config();
}

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var, @typescript-eslint/no-var-requires
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    //log: ["error"],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
