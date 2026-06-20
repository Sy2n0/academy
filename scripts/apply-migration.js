const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      path.join(
        __dirname,
        '../prisma/migrations/20260204034932_add_ctf_features/migration.sql'
      ),
      'utf-8'
    );

    console.log('Applying migration...');

    // SQL을 세미콜론으로 분리하여 실행
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await prisma.$executeRawUnsafe(statement);
        } catch (error) {
          // IF NOT EXISTS나 이미 존재하는 경우는 무시
          if (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('IF NOT EXISTS')
          ) {
            console.log(
              `Skipped (already exists): ${error.message.substring(0, 50)}`
            );
            continue;
          }
          throw error;
        }
      }
    }

    console.log('Migration applied successfully!');
    console.log('Next: Run npx prisma generate');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
