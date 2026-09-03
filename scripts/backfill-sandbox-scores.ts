/**
 * Backfill SANDBOX score history for solves that predate dynamic scoring.
 *
 * The 126 rows in SandboxSolve were recorded before awardPoints was wired into
 * the submit handler, so ScoreHistory carries no SANDBOX rows at all and every
 * sandbox ranking shows 0 points. This replays those solves through the dynamic
 * curve to produce the history they would have written.
 *
 * Each solve is valued by its position within its own problem, ordered by
 * solvedAt — so the person who actually got there first is credited as the
 * first solver. Replay is then done globally in solvedAt order so User.currentRank
 * steps the same way awardPoints would have stepped it, one rank at a time.
 *
 * Dry run by default. Pass --commit to write.
 *
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-sandbox-scores.ts
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-sandbox-scores.ts --commit
 */
import { PrismaClient, Prisma, ScoreType } from '@prisma/client';
import { calculateDynamicValue, calculateLimitedRank } from '../lib/ranks';

const prisma = new PrismaClient();

const INITIAL = Number(process.env.SANDBOX_INITIAL ?? 500);
const MINIMUM = Number(process.env.SANDBOX_MINIMUM ?? 250);
const COMMIT = process.argv.includes('--commit');

/**
 * Users whose totals are left untouched. They still occupy their place in each
 * problem's solve order — they really did solve those problems, and dropping
 * them from the ordering would silently promote everyone behind them — they
 * just receive no history rows and no points.
 */
const EXCLUDED_IDS = new Set(
  (
    process.env.SANDBOX_EXCLUDE_IDS ??
    '0921ff74-0a40-457b-bc9a-623241f610a8,dc8cc02e-82e6-4e39-a24e-a7ef9d945d5b'
  )
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
);

async function main() {
  if (MINIMUM > INITIAL) {
    throw new Error(`minimum (${MINIMUM}) may not exceed initial (${INITIAL})`);
  }

  const existing = await prisma.scoreHistory.count({
    where: { type: ScoreType.SANDBOX },
  });
  if (existing > 0) {
    throw new Error(
      `${existing} SANDBOX ScoreHistory rows already exist — this script only ` +
        `fills an empty history and would otherwise double-count. Inspect first.`
    );
  }

  const problems = await prisma.sandboxProblem.findMany({
    select: { id: true, title: true, decay: true },
  });
  const decayById = new Map(problems.map((p) => [p.id, p.decay]));
  const titleById = new Map(problems.map((p) => [p.id, p.title]));

  // Global chronological order; ties broken by id so runs are reproducible.
  const solves = await prisma.sandboxSolve.findMany({
    select: { id: true, userId: true, problemId: true, solvedAt: true },
    orderBy: [{ solvedAt: 'asc' }, { id: 'asc' }],
  });

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: Array.from(new Set(solves.map((s) => s.userId))).filter(
          (id) => !EXCLUDED_IDS.has(id)
        ),
      },
    },
    select: { id: true, name: true, totalPoints: true, currentRank: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const priorSolvesByProblem = new Map<string, number>();
  const running = new Map(
    users.map((u) => [
      u.id,
      { total: u.totalPoints, rank: u.currentRank, gained: 0, solves: 0 },
    ])
  );

  const rows: Prisma.ScoreHistoryCreateManyInput[] = [];

  for (const s of solves) {
    const prior = priorSolvesByProblem.get(s.problemId) ?? 0;
    const value = calculateDynamicValue(
      INITIAL,
      MINIMUM,
      decayById.get(s.problemId) ?? 15,
      prior
    );
    // Advance the problem's counter first, so an excluded solver still consumes
    // the position they actually took.
    priorSolvesByProblem.set(s.problemId, prior + 1);

    // Excluded, or the solver was deleted.
    const state = running.get(s.userId);
    if (!state) continue;

    // SANDBOX takes the caller's value as final (see calculateEarnedPoints),
    // so earned equals the curve's output exactly.
    state.total += value;
    state.rank = calculateLimitedRank(state.rank, state.total);
    state.gained += value;
    state.solves += 1;

    rows.push({
      userId: s.userId,
      type: ScoreType.SANDBOX,
      basePoints: value,
      earnedPoints: value,
      description: `Solved: ${titleById.get(s.problemId) ?? 'sandbox problem'}`,
      metadata: {
        problemId: s.problemId,
        problemTitle: titleById.get(s.problemId),
        priorSolves: prior,
        dynamicValue: value,
        firstBlood: prior === 0,
        backfilled: true,
      },
      createdAt: s.solvedAt,
    });
  }

  console.log(`\ncurve: initial ${INITIAL} · minimum ${MINIMUM}`);
  console.log(
    `solves seen: ${solves.length} · awarded: ${rows.length} · ` +
      `skipped (excluded): ${solves.length - rows.length}\n`
  );
  console.log('user            solves   points   total(before -> after)  rank');
  console.log('─'.repeat(72));
  const ranked = Array.from(running.entries())
    .map(([id, st]) => ({ id, ...st, user: userById.get(id)! }))
    .sort((a, b) => b.gained - a.gained);
  for (const r of ranked) {
    console.log(
      `${(r.user.name ?? r.id).padEnd(14)}  ${String(r.solves).padStart(5)}  ${String(
        r.gained
      ).padStart(7)}   ${String(r.user.totalPoints).padStart(7)} -> ${String(
        r.total
      ).padStart(7)}   ${r.user.currentRank} -> ${r.rank}`
    );
  }
  const totalAwarded = ranked.reduce((n, r) => n + r.gained, 0);
  console.log('─'.repeat(72));
  console.log(`total awarded: ${totalAwarded}\n`);

  if (!COMMIT) {
    console.log('DRY RUN — nothing written. Re-run with --commit to apply.\n');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.sandboxProblem.updateMany({
      data: { initialValue: INITIAL, minimumValue: MINIMUM },
    });
    await tx.scoreHistory.createMany({ data: rows });
    for (const r of ranked) {
      await tx.user.update({
        where: { id: r.id },
        data: { totalPoints: r.total, currentRank: r.rank },
      });
    }
  });
  console.log(
    `COMMITTED — ${rows.length} score rows, ${ranked.length} users updated, ` +
      `all problems set to ${INITIAL}/${MINIMUM}.\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
