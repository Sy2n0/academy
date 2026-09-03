import { prisma } from '@/lib/prisma';
import { ScoreType, UserRole } from '@prisma/client';
import { getCache, setCache, deleteCachePattern } from '@/lib/redis';
import { calculateEarnedPoints, calculateLimitedRank } from '@/lib/ranks';

/**
 * 사용자에게 점수를 부여합니다.
 * 랭크에 따라 실제 획득 점수가 조정됩니다.
 */
export async function awardPoints(
  userId: string,
  type: ScoreType,
  basePoints: number,
  description?: string,
  metadata?: Record<string, any>
) {
  // 현재 사용자 정보 가져오기
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 수학적 점수 계산: 사용자의 현재 총점에 따라 점수 조정
  // 랭크는 항상 올라가기만 하도록, 사용자별로 고정된 점수 체계 사용
  const earnedPoints = calculateEarnedPoints(
    basePoints,
    type,
    user.totalPoints
  );

  // 트랜잭션으로 점수 추가 및 랭크 업데이트
  const result = await prisma.$transaction(async (tx) => {
    // 점수 이력 저장
    const scoreHistory = await tx.scoreHistory.create({
      data: {
        userId,
        type,
        basePoints,
        earnedPoints,
        description,
        metadata: metadata ? metadata : undefined,
      },
    });

    // 사용자 점수 업데이트
    const newTotalPoints = user.totalPoints + earnedPoints;
    // 한 번에 최대 한 랭크씩만 올라가도록 제한
    const newRank = calculateLimitedRank(user.currentRank, newTotalPoints);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        totalPoints: newTotalPoints,
        currentRank: newRank,
      },
    });

    return {
      scoreHistory,
      user: updatedUser,
      pointsEarned: earnedPoints,
      rankUp: newRank > user.currentRank,
    };
  });

  return result;
}

/**
 * 사용자의 점수 이력을 조회합니다.
 */
export async function getUserScoreHistory(
  userId: string,
  type?: ScoreType,
  limit: number = 50
) {
  try {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    return await prisma.scoreHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Error in getUserScoreHistory:', error);
    // 기본값 반환 (빈 배열)
    return [];
  }
}

/**
 * 사용자의 점수 통계를 조회합니다.
 */
export async function getUserScoreStats(userId: string) {
  try {
    const [totalHistory, byType] = await Promise.all([
      prisma.scoreHistory.aggregate({
        where: { userId },
        _sum: {
          earnedPoints: true,
          basePoints: true,
        },
        _count: true,
      }),
      prisma.scoreHistory.groupBy({
        by: ['type'],
        where: { userId },
        _sum: {
          earnedPoints: true,
          basePoints: true,
        },
        _count: true,
      }),
    ]);

    return {
      total: {
        earned: totalHistory._sum.earnedPoints || 0,
        base: totalHistory._sum.basePoints || 0,
        count: totalHistory._count,
      },
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = {
            earned: item._sum.earnedPoints || 0,
            base: item._sum.basePoints || 0,
            count: item._count,
          };
          return acc;
        },
        {} as Record<ScoreType, { earned: number; base: number; count: number }>
      ),
    };
  } catch (error) {
    console.error('Error in getUserScoreStats:', error);
    // 기본값 반환
    return {
      total: {
        earned: 0,
        base: 0,
        count: 0,
      },
      byType: {} as Record<
        ScoreType,
        { earned: number; base: number; count: number }
      >,
    };
  }
}

/**
 * 랭킹을 조회합니다.
 */
export async function getRankings(limit: number = 100) {
  // Redis 캐시 확인
  const cacheKey = `rankings:total:v2:${limit}`;
  const cached = await getCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const users = await prisma.user.findMany({
    where: {
      role: {
        not: UserRole.ADMIN,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      totalPoints: true,
      currentRank: true,
    },
    orderBy: [
      { totalPoints: 'desc' },
      { updatedAt: 'asc' }, // 같은 점수면 먼저 달성한 사람이 위로
    ],
    take: limit,
  });

  // 각 사용자의 타입별 점수 계산
  const userIds = users.map((u) => u.id);
  const typeScores = await prisma.scoreHistory.groupBy({
    by: ['userId', 'type'],
    where: {
      userId: {
        in: userIds,
      },
    },
    _sum: {
      earnedPoints: true,
    },
  });

  // 타입별 점수를 사용자별로 그룹화
  const scoresByUser = typeScores.reduce(
    (acc, item) => {
      if (!acc[item.userId]) {
        acc[item.userId] = {
          MACHINE: 0,
          TRACK: 0,
          PLAYGROUND: 0,
        };
      }
      acc[item.userId][item.type] = item._sum.earnedPoints || 0;
      return acc;
    },
    {} as Record<string, { MACHINE: number; TRACK: number; PLAYGROUND: number }>
  );

  // 사용자 정보에 타입별 점수 추가
  const result = users.map((user) => ({
    ...user,
    machinePoints: scoresByUser[user.id]?.MACHINE || 0,
    trackPoints: scoresByUser[user.id]?.TRACK || 0,
    playgroundPoints: scoresByUser[user.id]?.PLAYGROUND || 0,
  }));

  // Redis 캐시에 저장 (5분 TTL)
  await setCache(cacheKey, result, 300);

  return result;
}

/**
 * 특정 사용자의 랭킹 순위를 조회합니다.
 */
export async function getUserRanking(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true, role: true },
  });

  if (!user || user.role === UserRole.ADMIN) {
    return -1;
  }

  const usersWithHigherPoints = await prisma.user.count({
    where: {
      role: {
        not: UserRole.ADMIN,
      },
      totalPoints: {
        gt: user.totalPoints,
      },
    },
  });

  return usersWithHigherPoints + 1;
}

/**
 * 특정 타입의 점수만으로 랭킹을 조회합니다.
 */
/**
 * Narrows a score query to one Playground season.
 *
 * ScoreHistory has no season column, so a PLAYGROUND ranking summed every
 * season that had ever run — a new season opened with the previous one's
 * standings already on the board. The season is in metadata: submit-flag writes
 * `playgroundCodeName` on every solve, always lowercased (challenges normalize
 * the code name on write), so the lookup lowercases to match.
 */
function seasonFilter(seasonCodeName?: string | null) {
  if (!seasonCodeName?.trim()) return {};
  return {
    metadata: {
      path: ['playgroundCodeName'],
      equals: seasonCodeName.trim().toLowerCase(),
    },
  } as const;
}

export async function getRankingsByType(
  type: ScoreType,
  limit: number = 100,
  seasonCodeName?: string | null
) {
  const season = seasonFilter(seasonCodeName);

  // 각 사용자의 해당 타입 점수 합계 계산
  const userScores = await prisma.scoreHistory.groupBy({
    by: ['userId'],
    where: { type, ...season },
    _sum: {
      earnedPoints: true,
    },
    orderBy: {
      _sum: {
        earnedPoints: 'desc',
      },
    },
  });

  // 사용자 ID 목록
  const userIds = userScores.map((item) => item.userId);

  // 사용자 정보 가져오기
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
      role: {
        not: UserRole.ADMIN,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      currentRank: true,
    },
  });

  // 각 사용자의 마지막 solve 정보 및 First Blood 개수 가져오기
  const lastSolves = await Promise.all(
    userIds.map(async (userId) => {
      const [lastSolve, allScores] = await Promise.all([
        prisma.scoreHistory.findFirst({
          where: {
            userId,
            type,
            ...season,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            description: true,
            metadata: true,
          },
        }),
        prisma.scoreHistory.findMany({
          where: {
            userId,
            type,
            ...season,
          },
          select: {
            metadata: true,
          },
        }),
      ]);

      // First Blood 개수 계산 (metadata에서 firstBlood가 true인 것들)
      const firstBloodCount = allScores.filter((score) => {
        if (score.metadata && typeof score.metadata === 'object') {
          const metadata = score.metadata as Record<string, any>;
          return (
            metadata.firstBlood === true ||
            metadata.first_blood === true ||
            metadata.firstBlood === 'true'
          );
        }
        return false;
      }).length;

      // metadata나 description에서 machine 이름 추출
      let machineName: string | null = null;
      if (lastSolve) {
        const meta =
          lastSolve.metadata && typeof lastSolve.metadata === 'object'
            ? (lastSolve.metadata as Record<string, any>)
            : null;
        // Only machines record a machineName. Playground and sandbox name the
        // thing solved differently, and without these the fallback reached the
        // description — which for playground is the constant string
        // "solved a challenge" for every row.
        machineName =
          (meta?.machineName as string) ??
          (meta?.challengeTitle as string) ??
          (meta?.problemTitle as string) ??
          lastSolve.description ??
          null;
      }

      return { userId, machineName, firstBloodCount };
    })
  );

  // 점수와 사용자 정보 결합
  const rankings = userScores
    .map((score) => {
      const user = users.find((u) => u.id === score.userId);
      if (!user) return null;

      const lastSolve = lastSolves.find((ls) => ls.userId === score.userId);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        points: score._sum.earnedPoints || 0,
        currentRank: user.currentRank,
        lastMachine: lastSolve?.machineName || null,
        firstBloodCount: lastSolve?.firstBloodCount || 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);

  return rankings;
}

/**
 * 특정 타입의 점수로 사용자의 랭킹 순위를 조회합니다.
 */
export async function getUserRankingByType(
  userId: string,
  type: ScoreType,
  seasonCodeName?: string | null
): Promise<number> {
  const season = seasonFilter(seasonCodeName);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role === UserRole.ADMIN) {
    return -1;
  }

  const nonAdminUsers = await prisma.user.findMany({
    where: {
      role: {
        not: UserRole.ADMIN,
      },
    },
    select: { id: true },
  });

  const nonAdminUserIds = nonAdminUsers.map((item) => item.id);

  if (!nonAdminUserIds.includes(userId)) {
    return -1;
  }

  // 사용자의 해당 타입 점수 합계
  const userScore = await prisma.scoreHistory.aggregate({
    where: {
      userId,
      type,
      ...season,
    },
    _sum: {
      earnedPoints: true,
    },
  });

  const userPoints = userScore._sum.earnedPoints || 0;

  // 더 높은 점수를 가진 사용자 수
  const usersWithHigherPoints = await prisma.scoreHistory.groupBy({
    by: ['userId'],
    where: {
      type,
      ...season,
      userId: {
        in: nonAdminUserIds,
      },
    },
    _sum: {
      earnedPoints: true,
    },
    having: {
      earnedPoints: {
        _sum: {
          gt: userPoints,
        },
      },
    },
  });

  return usersWithHigherPoints.length + 1;
}

/**
 * Sandbox rankings.
 *
 * Ranked on solve count rather than points, because the sandbox is a finite
 * curriculum — completing it is the goal, not accumulating an open-ended score.
 * Solves come from SandboxSolve, which is the authoritative record; ScoreHistory
 * only carries SANDBOX rows for solves made after awardPoints was wired into
 * the submit handler, so points are reported alongside but never used to sort.
 */
export async function getSandboxRankings(limit: number = 100) {
  const [problems, solves, pointRows] = await Promise.all([
    prisma.sandboxProblem.findMany({
      where: { isActive: true },
      select: { id: true, category: true },
    }),
    prisma.sandboxSolve.findMany({
      select: {
        userId: true,
        solvedAt: true,
        problem: { select: { id: true, category: true, isActive: true } },
      },
    }),
    prisma.scoreHistory.groupBy({
      by: ['userId'],
      where: { type: ScoreType.SANDBOX },
      _sum: { earnedPoints: true },
    }),
  ]);

  // Category totals drive the per-category "n/13" denominators.
  const categoryTotals: Record<string, number> = {};
  for (const p of problems) {
    categoryTotals[p.category] = (categoryTotals[p.category] ?? 0) + 1;
  }
  const totalProblems = problems.length;

  const pointsByUser = new Map(
    pointRows.map((r) => [r.userId, r._sum.earnedPoints ?? 0])
  );

  type Agg = {
    solved: number;
    byCategory: Record<string, number>;
    lastSolvedAt: Date | null;
  };
  const agg = new Map<string, Agg>();

  for (const s of solves) {
    // A retired problem should not inflate a total the denominator excludes.
    if (!s.problem.isActive) continue;
    const cur = agg.get(s.userId) ?? {
      solved: 0,
      byCategory: {},
      lastSolvedAt: null,
    };
    cur.solved += 1;
    cur.byCategory[s.problem.category] =
      (cur.byCategory[s.problem.category] ?? 0) + 1;
    if (!cur.lastSolvedAt || s.solvedAt > cur.lastSolvedAt) {
      cur.lastSolvedAt = s.solvedAt;
    }
    agg.set(s.userId, cur);
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: Array.from(agg.keys()) },
      role: { not: UserRole.ADMIN },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      currentRank: true,
    },
  });

  return {
    totalProblems,
    categoryTotals,
    rankings: users
      .map((u) => {
        const a = agg.get(u.id)!;
        return {
          ...u,
          solved: a.solved,
          byCategory: a.byCategory,
          // Earliest finisher outranks a later one on equal counts.
          lastSolvedAt: a.lastSolvedAt ? a.lastSolvedAt.toISOString() : null,
          points: pointsByUser.get(u.id) ?? 0,
        };
      })
      .sort(
        (a, b) =>
          b.solved - a.solved ||
          (a.lastSolvedAt ?? '').localeCompare(b.lastSolvedAt ?? '')
      )
      .slice(0, limit),
  };
}

export type ActivityEntry = {
  id: string;
  type: string;
  description: string;
  createdAt: Date;
  /** Points credited for this event, when it carried any. */
  earnedPoints: number;
};

/**
 * What the user actually did, merged from the records that hold it.
 *
 * The dashboard used to read ScoreHistory for this, which is a points ledger,
 * not an activity log — so anything that happened without awarding points was
 * invisible. Module completions were the clearest case: sixteen of them existed
 * and none appeared, because completing a module never wrote a score row.
 *
 * Each activity is read from its own source table so nothing is double-counted:
 * sandbox solves live in SandboxSolve *and* (since the backfill) in
 * ScoreHistory, so ScoreHistory is consulted only for the types that have no
 * other record of their own.
 */
export async function getUserActivity(
  userId: string,
  limit: number = 20
): Promise<ActivityEntry[]> {
  const [completions, solves, scored] = await Promise.all([
    prisma.userModuleCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        moduleId: true,
        completedAt: true,
        module: { select: { title: true } },
      },
    }),
    prisma.sandboxSolve.findMany({
      where: { userId },
      orderBy: { solvedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        problemId: true,
        solvedAt: true,
        problem: { select: { title: true } },
      },
    }),
    prisma.scoreHistory.findMany({
      where: {
        userId,
        type: { in: [ScoreType.MACHINE, ScoreType.PLAYGROUND] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        description: true,
        earnedPoints: true,
        createdAt: true,
      },
    }),
  ]);

  // Points for module and sandbox events, keyed by the id stored in metadata,
  // so a row can show what it was worth without being sourced from the ledger.
  const pointRows = await prisma.scoreHistory.findMany({
    where: { userId, type: { in: [ScoreType.TRACK, ScoreType.SANDBOX] } },
    select: { earnedPoints: true, metadata: true },
  });
  const pointsByKey = new Map<string, number>();
  for (const row of pointRows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const key = (meta.moduleId ?? meta.problemId) as string | undefined;
    if (key) pointsByKey.set(key, row.earnedPoints);
  }

  const entries: ActivityEntry[] = [
    ...completions.map((c) => ({
      id: `module-${c.id}`,
      type: 'MODULE',
      description: `Completed: ${c.module?.title ?? 'module'}`,
      createdAt: c.completedAt,
      earnedPoints: pointsByKey.get(c.moduleId) ?? 0,
    })),
    ...solves.map((s) => ({
      id: `sandbox-${s.id}`,
      type: 'SANDBOX',
      description: `Solved: ${s.problem?.title ?? 'problem'}`,
      createdAt: s.solvedAt,
      earnedPoints: pointsByKey.get(s.problemId) ?? 0,
    })),
    ...scored.map((h) => ({
      id: `score-${h.id}`,
      type: h.type,
      description: h.description ?? `${h.type} completed`,
      createdAt: h.createdAt,
      earnedPoints: h.earnedPoints,
    })),
  ];

  return entries
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Every timestamp on which the user did something, for the weekly streak.
 *
 * The streak used to be derived from ScoreHistory, so a week spent completing
 * modules — which awarded no points — counted as a week off.
 */
export async function getUserActivityWeeks(userId: string): Promise<Date[]> {
  const [completions, solves, scored] = await Promise.all([
    prisma.userModuleCompletion.findMany({
      where: { userId },
      select: { completedAt: true },
    }),
    prisma.sandboxSolve.findMany({
      where: { userId },
      select: { solvedAt: true },
    }),
    prisma.scoreHistory.findMany({
      where: { userId },
      select: { createdAt: true },
    }),
  ]);

  return [
    ...completions.map((c) => c.completedAt),
    ...solves.map((s) => s.solvedAt),
    ...scored.map((h) => h.createdAt),
  ];
}
