/**
 * Undo the TRACK score rows written by scripts/backfill-missing-scores.ts.
 *
 * Module completions were given points on a misread instruction; they were never
 * meant to be scored. Only rows this backfill created are touched — they carry
 * metadata.backfilled — so any TRACK points awarded some other way survive.
 *
 * Ranks are not restored because none moved: every user in that run stayed on
 * the rank they were already on, so returning totalPoints is a full undo.
 *
 * Dry run by default. Pass --commit to write.
 */
import { PrismaClient, ScoreType } from '@prisma/client';
import { calculateRank } from '../lib/ranks';

const prisma = new PrismaClient();
const COMMIT = process.argv.includes('--commit');

async function main() {
  const rows = await prisma.scoreHistory.findMany({
    where: { type: ScoreType.TRACK },
    select: { id: true, userId: true, earnedPoints: true, metadata: true },
  });
  const backfilled = rows.filter((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return meta.backfilled === true;
  });

  if (backfilled.length === 0) {
    console.log('\nNothing to revert.\n');
    return;
  }

  const byUser = new Map<string, number>();
  for (const r of backfilled) {
    byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + r.earnedPoints);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(byUser.keys()) } },
    select: { id: true, name: true, totalPoints: true, currentRank: true },
  });

  console.log(`\nrows to delete: ${backfilled.length}\n`);
  console.log('user            points   total(now -> after)   rank');
  console.log('─'.repeat(60));
  const plan = users.map((u) => {
    const back = byUser.get(u.id) ?? 0;
    const total = Math.max(0, u.totalPoints - back);
    return { ...u, back, total, rank: calculateRank(total) };
  });
  for (const p of plan) {
    console.log(
      `${(p.name ?? p.id).padEnd(14)}  ${String(p.back).padStart(6)}   ${String(
        p.totalPoints
      ).padStart(
        7
      )} -> ${String(p.total).padStart(7)}   ${p.currentRank} -> ${p.rank}`
    );
  }
  console.log('─'.repeat(60));
  console.log(`total removed: ${plan.reduce((n, p) => n + p.back, 0)}\n`);

  if (!COMMIT) {
    console.log('DRY RUN — nothing written. Re-run with --commit to apply.\n');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.scoreHistory.deleteMany({
      where: { id: { in: backfilled.map((r) => r.id) } },
    });
    for (const p of plan) {
      await tx.user.update({
        where: { id: p.id },
        data: { totalPoints: p.total, currentRank: p.rank },
      });
    }
  });
  console.log(
    `COMMITTED — ${backfilled.length} rows deleted, ${plan.length} users restored.\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
