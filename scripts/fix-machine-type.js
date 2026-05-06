const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMachineType() {
  try {
    console.log('Fixing Machine type column...');

    // 1. MachineType enum 생성 (이미 있으면 무시)
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "MachineType" AS ENUM ('STATIC_ATTACHMENT', 'DYNAMIC_ATTACHMENT', 'STATIC_CONTAINER', 'DYNAMIC_CONTAINER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // 2. 임시 컬럼 생성
    await prisma.$executeRaw`
      ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "type_temp" TEXT;
    `;

    // 3. 데이터 변환
    await prisma.$executeRaw`
      UPDATE "Machine" 
      SET "type_temp" = CASE 
        WHEN "type"::text = 'static' THEN 'STATIC_CONTAINER'
        WHEN "type"::text = 'dynamic-container' THEN 'DYNAMIC_CONTAINER'
        WHEN "type"::text = 'static-attachment' THEN 'STATIC_ATTACHMENT'
        WHEN "type"::text = 'dynamic-attachment' THEN 'DYNAMIC_ATTACHMENT'
        ELSE 'STATIC_CONTAINER'
      END
      WHERE "type_temp" IS NULL;
    `;

    // 4. 기존 컬럼 삭제
    await prisma.$executeRaw`
      ALTER TABLE "Machine" DROP COLUMN IF EXISTS "type";
    `;

    // 5. 새 컬럼 이름 변경
    await prisma.$executeRaw`
      ALTER TABLE "Machine" RENAME COLUMN "type_temp" TO "type";
    `;

    // 6. enum 타입으로 변경
    await prisma.$executeRaw`
      ALTER TABLE "Machine" 
      ALTER COLUMN "type" TYPE "MachineType" USING "type"::"MachineType";
    `;

    console.log('Machine type column fixed successfully!');

    // 확인
    const machines = await prisma.$queryRaw`
      SELECT id, title, type FROM "Machine"
    `;
    console.log('Updated machines:', machines);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMachineType();
