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
export async function getRankingsByType(type: ScoreType, limit: number = 100) {
  // 각 사용자의 해당 타입 점수 합계 계산
  const userScores = await prisma.scoreHistory.groupBy({
    by: ['userId'],
    where: { type },
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
        if (
          lastSolve.metadata &&
          typeof lastSolve.metadata === 'object' &&
          'machineName' in lastSolve.metadata
        ) {
          machineName = lastSolve.metadata.machineName as string;
        } else if (lastSolve.description) {
          machineName = lastSolve.description;
        }
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
  type: ScoreType
): Promise<number> {
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
