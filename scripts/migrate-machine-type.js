const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// String type을 MachineType enum으로 매핑
const typeMapping = {
  'static': 'STATIC_CONTAINER',
  'dynamic-container': 'DYNAMIC_CONTAINER',
  'static-attachment': 'STATIC_ATTACHMENT',
  'dynamic-attachment': 'DYNAMIC_ATTACHMENT',
};

async function migrateMachineType() {
  try {
    console.log('Starting migration...');

    // 1. 기존 데이터 확인
    const machines = await prisma.machine.findMany({
      select: {
        id: true,
        title: true,
        type: true,
      },
    });

    console.log(`Found ${machines.length} machines to migrate`);

    // 2. PostgreSQL에서 직접 타입 변환 (Prisma는 enum 타입 변경을 직접 지원하지 않음)
    // 먼저 임시 컬럼 생성
    await prisma.$executeRaw`
      ALTER TABLE "Machine" 
      ADD COLUMN "type_new" TEXT;
    `;

    // 3. 데이터 변환 및 복사
    for (const machine of machines) {
      const newType = typeMapping[machine.type] || 'STATIC_CONTAINER';
      console.log(`Migrating ${machine.title}: ${machine.type} -> ${newType}`);
      
      await prisma.$executeRaw`
        UPDATE "Machine"
        SET "type_new" = ${newType}
        WHERE id = ${machine.id}
      `;
    }

    // 4. 기존 컬럼 삭제 및 새 컬럼 이름 변경
    await prisma.$executeRaw`
      ALTER TABLE "Machine"
      DROP COLUMN "type";
    `;

    await prisma.$executeRaw`
      ALTER TABLE "Machine"
      RENAME COLUMN "type_new" TO "type";
    `;

    // 5. enum 타입으로 변경
    await prisma.$executeRaw`
      ALTER TABLE "Machine"
      ALTER COLUMN "type" TYPE "MachineType" USING "type"::"MachineType";
    `;

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateMachineType();
