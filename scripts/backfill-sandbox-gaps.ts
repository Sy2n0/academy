/**
 * Award SANDBOX points for solves that have no score row.
 *
 * Fills partial gaps that scripts/backfill-sandbox-scores.ts cannot: that one
 * refuses to run once any SANDBOX row exists, so it is useless for a user who
 * was excluded from the original pass and needs adding later.
 *
 * Module completions are deliberately NOT scored. Completing a module records a
 * UserModuleCompletion and nothing else; the dashboard reads activity from that
 * table (see getUserActivity), so it shows up without needing points. An earlier
 * version of this script awarded TRACK points for them and had to be reverted —
 * the module branch is gone so that cannot happen again.
 *
 * Solves are replayed in chronological order because calculateEarnedPoints
 * scales with the user's total at the time.
 *
 * Existing score rows are left alone, so an event inserted "before" an existing
 * one does not retroactively reduce what that later event earned.
 *
 * Dry run by default. Pass --commit to write.
 */
import { PrismaClient, Prisma, ScoreType } from '@prisma/client';
import {
  calculateDynamicValue,
  calculateEarnedPoints,
  calculateLimitedRank,
} from '../lib/ranks';

const prisma = new PrismaClient();
const COMMIT = process.argv.includes('--commit');

type Pending = {
  userId: string;
  at: Date;
  title: string;
  /** Sandbox only: solves recorded before this one, for the decay curve. */
  priorSolves?: number;
  refId: string;
};

async function main() {
  // --- what already has points -------------------------------------------
  const scored = await prisma.scoreHistory.findMany({
    where: { type: ScoreType.SANDBOX },
    select: { userId: true, type: true, metadata: true },
  });
  const alreadyScored = new Set<string>();
  for (const row of scored) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const ref = meta.problemId as string | undefined;
    if (ref) alreadyScored.add(`${row.userId}:${ref}`);
  }

  // --- sandbox solves ------------------------------------------------------
  const problems = await prisma.sandboxProblem.findMany({
    select: {
      id: true,
      title: true,
      initialValue: true,
      minimumValue: true,
      decay: true,
    },
  });
  const problemById = new Map(problems.map((p) => [p.id, p]));

  const solves = await prisma.sandboxSolve.findMany({
    select: { id: true, userId: true, problemId: true, solvedAt: true },
    orderBy: [{ solvedAt: 'asc' }, { id: 'asc' }],
  });
  // Position within each problem, counted over every solve so a skipped user
  // still occupies the place they actually took.
  const seenPerProblem = new Map<string, number>();
  const solveRank = new Map<string, number>();
  for (const s of solves) {
    const n = seenPerProblem.get(s.problemId) ?? 0;
    solveRank.set(s.id, n);
    seenPerProblem.set(s.problemId, n + 1);
  }

  const pending: Pending[] = [
    ...solves
      .filter((s) => !alreadyScored.has(`${s.userId}:${s.problemId}`))
      .map((s) => ({
        userId: s.userId,
        at: s.solvedAt,
        title: problemById.get(s.problemId)?.title ?? 'problem',
        priorSolves: solveRank.get(s.id) ?? 0,
        refId: s.problemId,
      })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  if (pending.length === 0) {
    console.log(
      '\nNothing missing — every activity already has a score row.\n'
    );
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(pending.map((p) => p.userId))) } },
    select: { id: true, name: true, totalPoints: true, currentRank: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));
  const running = new Map(
    users.map((u) => [
      u.id,
      {
        total: u.totalPoints,
        rank: u.currentRank,
        gained: 0,
        sandbox: 0,
      },
    ])
  );

  const rows: Prisma.ScoreHistoryCreateManyInput[] = [];

  for (const item of pending) {
    const state = running.get(item.userId);
    if (!state) continue; // user deleted

    const problem = problemById.get(item.refId)!;
    const value = calculateDynamicValue(
      problem.initialValue,
      problem.minimumValue,
      problem.decay,
      item.priorSolves ?? 0
    );
    const earned = calculateEarnedPoints(value, 'SANDBOX', state.total);
    const metadata: Prisma.InputJsonObject = {
      problemId: item.refId,
      problemTitle: item.title,
      priorSolves: item.priorSolves,
      dynamicValue: value,
      firstBlood: item.priorSolves === 0,
      backfilled: true,
    };
    state.sandbox += 1;

    state.total += earned;
    state.rank = calculateLimitedRank(state.rank, state.total);
    state.gained += earned;

    rows.push({
      userId: item.userId,
      type: ScoreType.SANDBOX,
      basePoints: earned,
      earnedPoints: earned,
      description: `Solved: ${item.title}`,
      metadata,
      createdAt: item.at,
    });
  }

  console.log(`\nmissing events: ${rows.length}\n`);
  console.log(
    'user             solves   points   total(before -> after)  rank'
  );
  console.log('─'.repeat(78));
  const ranked = Array.from(running.entries())
    .map(([id, st]) => ({ id, ...st, user: userById.get(id)! }))
    .filter((r) => r.gained > 0)
    .sort((a, b) => b.gained - a.gained);
  for (const r of ranked) {
    console.log(
      `${(r.user.name ?? r.id).padEnd(14)}  ${String(r.sandbox).padStart(6)}  ${String(
        r.gained
      ).padStart(7)}   ${String(r.user.totalPoints).padStart(7)} -> ${String(
        r.total
      ).padStart(7)}   ${r.user.currentRank} -> ${r.rank}`
    );
  }
  console.log('─'.repeat(78));
  console.log(`total awarded: ${ranked.reduce((n, r) => n + r.gained, 0)}\n`);

  if (!COMMIT) {
    console.log('DRY RUN — nothing written. Re-run with --commit to apply.\n');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.scoreHistory.createMany({ data: rows });
    for (const r of ranked) {
      await tx.user.update({
        where: { id: r.id },
        data: { totalPoints: r.total, currentRank: r.rank },
      });
    }
  });
  console.log(
    `COMMITTED — ${rows.length} score rows, ${ranked.length} users updated.\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
