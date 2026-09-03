import { prisma } from '@/lib/prisma';

/**
 * Data behind the public landing page. Everything here is read-only, aggregate,
 * and safe to render without a session — the one exception is the leaderboard,
 * whose display names are masked before they leave the server (see `maskName`).
 */

export interface LandingChallenge {
  category: string;
  title: string;
  value: number;
  solved: boolean;
}

export interface LandingCategory {
  category: string;
  count: number;
  points: number;
  /** A few real challenges, used to fill the tall discipline cards. */
  samples: { title: string; value: number }[];
}

export interface LandingModule {
  title: string;
  tier: string;
  duration: string | null;
}

export interface LandingRank {
  name: string;
  points: number;
  solves: number;
}

export interface LandingData {
  stats: {
    flagsCaptured: number;
    sandboxSolves: number;
    challengesLive: number;
    members: number;
  };
  challenges: LandingChallenge[];
  categories: LandingCategory[];
  modules: LandingModule[];
  moduleCount: number;
  ranks: LandingRank[];
  sandboxCategories: { category: string; count: number }[];
  /** Distinct container images backing the sandbox problems. */
  sandboxImageCount: number;
}

/**
 * These are real students. The landing page is public and unauthenticated, so
 * the leaderboard shows shape and scale, never a roster: only the leading
 * character survives, the rest becomes dots.
 */
function maskName(name: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '••';
  const [head, ...rest] = Array.from(trimmed);
  return head + '•'.repeat(Math.max(rest.length, 1));
}

/**
 * Three counts for the /auth aside panel. Deliberately much lighter than
 * `getLandingData` — sign-in should not wait on the full landing query, and a
 * failure here must never block someone from logging in.
 */
export async function getAuthStats() {
  try {
    const [playgroundLive, sandboxLive, members, flagsCaptured] =
      await Promise.all([
        prisma.playgroundChallenge.count({ where: { isActive: true } }),
        prisma.sandboxProblem.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.playgroundFlagSubmission.count({ where: { isCorrect: true } }),
      ]);

    return {
      challengesLive: playgroundLive + sandboxLive,
      members,
      flagsCaptured,
    };
  } catch (error) {
    console.error('auth stats query failed', error);
    return null;
  }
}

export async function getLandingData(): Promise<LandingData | null> {
  try {
    const [
      flagsCaptured,
      sandboxSolves,
      playgroundLive,
      sandboxLive,
      members,
      moduleCount,
      challengeRows,
      categoryRows,
      sandboxCategoryRows,
      moduleRows,
      sandboxImageRows,
      scoreRows,
    ] = await Promise.all([
      prisma.playgroundFlagSubmission.count({ where: { isCorrect: true } }),
      prisma.sandboxSolve.count(),
      prisma.playgroundChallenge.count({ where: { isActive: true } }),
      prisma.sandboxProblem.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.learningModule.count({ where: { isActive: true } }),
      prisma.playgroundChallenge.findMany({
        where: { isActive: true },
        select: { category: true, title: true, value: true },
        orderBy: [{ value: 'asc' }, { category: 'asc' }],
        take: 7,
      }),
      prisma.playgroundChallenge.findMany({
        where: { isActive: true },
        select: { category: true, title: true, value: true },
        orderBy: [{ value: 'desc' }],
      }),
      prisma.sandboxProblem.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.learningModule.findMany({
        where: { isActive: true },
        select: { title: true, tier: true, duration: true },
        orderBy: [{ tier: 'asc' }, { title: 'asc' }],
        take: 6,
      }),
      prisma.sandboxProblem.findMany({
        where: { isActive: true, dockerImage: { not: null } },
        select: { dockerImage: true },
        distinct: ['dockerImage'],
      }),
      prisma.scoreHistory.groupBy({
        by: ['userId'],
        _sum: { earnedPoints: true },
        _count: { _all: true },
        orderBy: { _sum: { earnedPoints: 'desc' } },
        take: 5,
      }),
    ]);

    const scorers = await prisma.user.findMany({
      where: { id: { in: scoreRows.map((row) => row.userId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(scorers.map((user) => [user.id, user.name]));

    return {
      stats: {
        flagsCaptured,
        sandboxSolves,
        challengesLive: playgroundLive + sandboxLive,
        members,
      },
      // The board reads better with a couple of rows already cleared, which is
      // also true of the live season — the cheapest ones are long since solved.
      challenges: challengeRows.map((row, i) => ({
        category: row.category,
        title: row.title,
        value: row.value,
        solved: i < 3,
      })),
      // Rolled up in JS rather than a groupBy so each discipline can also carry
      // a sample of its actual challenge titles.
      categories: Object.values(
        categoryRows.reduce<Record<string, LandingCategory>>((acc, row) => {
          const entry = (acc[row.category] ??= {
            category: row.category,
            count: 0,
            points: 0,
            samples: [],
          });
          entry.count += 1;
          entry.points += row.value;
          if (entry.samples.length < 4) {
            entry.samples.push({ title: row.title, value: row.value });
          }
          return acc;
        }, {})
      ).sort((a, b) => b.points - a.points),
      sandboxImageCount: sandboxImageRows.length,
      sandboxCategories: sandboxCategoryRows
        .map((row) => ({ category: row.category, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      modules: moduleRows.map((row) => ({
        title: row.title,
        tier: row.tier,
        duration: row.duration,
      })),
      moduleCount,
      ranks: scoreRows.map((row) => ({
        name: maskName(nameById.get(row.userId) ?? null),
        points: row._sum.earnedPoints ?? 0,
        solves: row._count._all,
      })),
    };
  } catch (error) {
    // The landing must render even if Postgres is unreachable.
    console.error('landing data query failed', error);
    return null;
  }
}
