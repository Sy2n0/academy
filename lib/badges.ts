import { prisma } from '@/lib/prisma';

export const ensureBadgeInfrastructure = async () => {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PlaygroundSettings"
    ADD COLUMN IF NOT EXISTS "badgeName" TEXT,
    ADD COLUMN IF NOT EXISTS "badgeImage" TEXT,
    ADD COLUMN IF NOT EXISTS "badgeDescription" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BadgeCatalog" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "imageUrl" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlaygroundBadgeMapping" (
      "id" TEXT PRIMARY KEY,
      "playgroundCodeName" TEXT NOT NULL UNIQUE,
      "badgeId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlaygroundBadgeMapping_badgeId_fkey"
        FOREIGN KEY ("badgeId") REFERENCES "BadgeCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserBadgeAssignment" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "badgeId" TEXT NOT NULL,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserBadgeAssignment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "UserBadgeAssignment_badgeId_fkey"
        FOREIGN KEY ("badgeId") REFERENCES "BadgeCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "UserBadgeAssignment_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "UserBadgeAssignment_userId_badgeId_key" UNIQUE ("userId", "badgeId")
    );
  `);
};
