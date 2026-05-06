const fs = require('fs');
const path = require('path');

// 마이그레이션 파일 생성
const migrationDir = path.join(__dirname, '../prisma/migrations');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
const migrationName = `${timestamp}_add_ctf_features`;
const migrationPath = path.join(migrationDir, migrationName);

// 디렉토리 생성
if (!fs.existsSync(migrationPath)) {
  fs.mkdirSync(migrationPath, { recursive: true });
}

// migration.sql 파일 생성
const migrationSQL = `
-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('STATIC_ATTACHMENT', 'DYNAMIC_ATTACHMENT', 'STATIC_CONTAINER', 'DYNAMIC_CONTAINER');

-- AlterTable: Machine - type 필드를 enum으로 변환
-- 1. 임시 컬럼 생성
ALTER TABLE "Machine" ADD COLUMN "type_temp" TEXT;

-- 2. 기존 데이터 변환 (static -> STATIC_CONTAINER, dynamic-container -> DYNAMIC_CONTAINER)
UPDATE "Machine" SET "type_temp" = CASE 
  WHEN "type" = 'static' THEN 'STATIC_CONTAINER'
  WHEN "type" = 'dynamic-container' THEN 'DYNAMIC_CONTAINER'
  WHEN "type" = 'static-attachment' THEN 'STATIC_ATTACHMENT'
  WHEN "type" = 'dynamic-attachment' THEN 'DYNAMIC_ATTACHMENT'
  ELSE 'STATIC_CONTAINER'
END;

-- 3. 기존 컬럼 삭제
ALTER TABLE "Machine" DROP COLUMN "type";

-- 4. 새 컬럼 이름 변경
ALTER TABLE "Machine" RENAME COLUMN "type_temp" TO "type";

-- 5. enum 타입으로 변경
ALTER TABLE "Machine" ALTER COLUMN "type" TYPE "MachineType" USING "type"::"MachineType";

-- AlterTable: Machine - 새 필드 추가
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "flagTemplate" TEXT;
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "staticFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Machine" ALTER COLUMN "bloodBonus" SET DEFAULT true;

-- CreateTable: MachineFlag
CREATE TABLE IF NOT EXISTS "MachineFlag" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "teamId" TEXT,
    "userId" TEXT,
    "isStatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FlagSubmission
CREATE TABLE IF NOT EXISTS "FlagSubmission" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "flagId" TEXT,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "submittedFlag" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "earnedPoints" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "isFirstBlood" BOOLEAN NOT NULL DEFAULT false,
    "bloodBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContainerInstance
CREATE TABLE IF NOT EXISTS "ContainerInstance" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "containerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "ports" JSONB,
    "flag" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ContainerInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Writeup
CREATE TABLE IF NOT EXISTS "Writeup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Writeup_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventLog
CREATE TABLE IF NOT EXISTS "EventLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "machineId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Team
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Machine_type_idx" ON "Machine"("type");
CREATE INDEX IF NOT EXISTS "MachineFlag_machineId_idx" ON "MachineFlag"("machineId");
CREATE INDEX IF NOT EXISTS "MachineFlag_teamId_idx" ON "MachineFlag"("teamId");
CREATE INDEX IF NOT EXISTS "MachineFlag_userId_idx" ON "MachineFlag"("userId");
CREATE INDEX IF NOT EXISTS "FlagSubmission_machineId_idx" ON "FlagSubmission"("machineId");
CREATE INDEX IF NOT EXISTS "FlagSubmission_userId_idx" ON "FlagSubmission"("userId");
CREATE INDEX IF NOT EXISTS "FlagSubmission_teamId_idx" ON "FlagSubmission"("teamId");
CREATE INDEX IF NOT EXISTS "FlagSubmission_isCorrect_idx" ON "FlagSubmission"("isCorrect");
CREATE INDEX IF NOT EXISTS "FlagSubmission_createdAt_idx" ON "FlagSubmission"("createdAt");
CREATE INDEX IF NOT EXISTS "ContainerInstance_machineId_idx" ON "ContainerInstance"("machineId");
CREATE INDEX IF NOT EXISTS "ContainerInstance_userId_idx" ON "ContainerInstance"("userId");
CREATE INDEX IF NOT EXISTS "ContainerInstance_teamId_idx" ON "ContainerInstance"("teamId");
CREATE INDEX IF NOT EXISTS "ContainerInstance_status_idx" ON "ContainerInstance"("status");
CREATE INDEX IF NOT EXISTS "Writeup_userId_idx" ON "Writeup"("userId");
CREATE INDEX IF NOT EXISTS "Writeup_machineId_idx" ON "Writeup"("machineId");
CREATE INDEX IF NOT EXISTS "Writeup_status_idx" ON "Writeup"("status");
CREATE INDEX IF NOT EXISTS "EventLog_type_idx" ON "EventLog"("type");
CREATE INDEX IF NOT EXISTS "EventLog_userId_idx" ON "EventLog"("userId");
CREATE INDEX IF NOT EXISTS "EventLog_teamId_idx" ON "EventLog"("teamId");
CREATE INDEX IF NOT EXISTS "EventLog_machineId_idx" ON "EventLog"("machineId");
CREATE INDEX IF NOT EXISTS "EventLog_createdAt_idx" ON "EventLog"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Team_inviteCode_key" ON "Team"("inviteCode");
CREATE UNIQUE INDEX IF NOT EXISTS "MachineFlag_machineId_teamId_userId_key" ON "MachineFlag"("machineId", "teamId", "userId");

-- AddForeignKey
ALTER TABLE "MachineFlag" ADD CONSTRAINT "MachineFlag_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MachineFlag" ADD CONSTRAINT "MachineFlag_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MachineFlag" ADD CONSTRAINT "MachineFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlagSubmission" ADD CONSTRAINT "FlagSubmission_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlagSubmission" ADD CONSTRAINT "FlagSubmission_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "MachineFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FlagSubmission" ADD CONSTRAINT "FlagSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlagSubmission" ADD CONSTRAINT "FlagSubmission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContainerInstance" ADD CONSTRAINT "ContainerInstance_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContainerInstance" ADD CONSTRAINT "ContainerInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContainerInstance" ADD CONSTRAINT "ContainerInstance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Writeup" ADD CONSTRAINT "Writeup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Writeup" ADD CONSTRAINT "Writeup_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`;

fs.writeFileSync(path.join(migrationPath, 'migration.sql'), migrationSQL.trim());

console.log(`Migration file created at: ${migrationPath}/migration.sql`);
console.log('Next steps:');
console.log('1. Review the migration.sql file');
console.log('2. Run: npx prisma migrate resolve --applied add_ctf_features');
console.log('3. Run: npx prisma generate');
