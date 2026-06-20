import { prisma } from '@/lib/prisma';
import { calculateFinalScore } from '@/lib/scoring';
import { calculateLimitedRank } from '@/lib/ranks';
import { MachineType } from '@prisma/client';
import { notifyFirstBlood, notifyFlagSubmission } from '@/lib/notifications';

/**
 * 플래그 제출 처리
 */
export async function submitFlag(
  machineId: string,
  userId: string,
  teamId: string | null,
  submittedFlag: string
): Promise<{
  success: boolean;
  isCorrect: boolean;
  earnedPoints: number;
  bloodBonus: number;
  isFirstBlood: boolean;
  bloodRank: number | null;
  message: string;
}> {
  // Machine 정보 가져오기
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
  });

  if (!machine) {
    throw new Error('Machine not found');
  }

  if (!machine.isActive) {
    throw new Error('Machine is not active');
  }

  // 이전 제출 기록 확인
  const previousSubmissions = await prisma.flagSubmission.findMany({
    where: {
      machineId,
      userId,
      teamId: teamId || null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 최대 시도 횟수 확인
  if (
    machine.maxAttempts !== null &&
    previousSubmissions.length >= machine.maxAttempts
  ) {
    throw new Error('Maximum attempts exceeded');
  }

  // 이미 정답을 맞춘 경우
  const correctSubmission = previousSubmissions.find((s) => s.isCorrect);
  if (correctSubmission) {
    return {
      success: false,
      isCorrect: false,
      earnedPoints: 0,
      bloodBonus: 0,
      isFirstBlood: false,
      bloodRank: null,
      message: 'You have already solved this machine',
    };
  }

  // 플래그 검증
  let isCorrect = false;
  let matchedFlag: { id: string; flag: string } | null = null;

  // Machine 타입에 따라 플래그 검증 방식이 다름
  if (
    machine.type === MachineType.STATIC_ATTACHMENT ||
    machine.type === MachineType.STATIC_CONTAINER
  ) {
    // 정적 플래그: staticFlags 배열에서 검색
    if (machine.staticFlags.includes(submittedFlag)) {
      isCorrect = true;
      // 정적 플래그는 MachineFlag에 저장되지 않을 수 있음
    }
  } else {
    // 동적 플래그: MachineFlag 테이블에서 검색
    const flag = await prisma.machineFlag.findFirst({
      where: {
        machineId,
        flag: submittedFlag,
        OR: [
          { userId: userId },
          { teamId: teamId || null },
          { isStatic: true },
        ],
      },
    });

    if (flag) {
      isCorrect = true;
      matchedFlag = { id: flag.id, flag: flag.flag };
    }
  }

  // 시도 횟수 증가
  const attemptNumber = previousSubmissions.length + 1;

  // 정답인 경우 점수 계산
  let earnedPoints = 0;
  let bloodBonus = 0;
  let isFirstBlood = false;
  let bloodRank: number | null = null;

  if (isCorrect) {
    // 전체 해결 횟수 확인 (First Blood 순위 결정용)
    const allCorrectSubmissions = await prisma.flagSubmission.findMany({
      where: {
        machineId,
        isCorrect: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const solveCount = allCorrectSubmissions.length + 1; // 현재 제출 포함
    bloodRank = solveCount <= 3 ? solveCount : null;
    isFirstBlood = solveCount === 1;

    // 점수 계산
    const scoreResult = calculateFinalScore(
      machine.score,
      machine.minimumScoreRatio,
      machine.difficultyFactor,
      solveCount,
      bloodRank,
      machine.bloodBonus
    );

    earnedPoints = scoreResult.finalScore;
    bloodBonus = scoreResult.bloodBonus;

    // FlagSubmission 생성
    await prisma.flagSubmission.create({
      data: {
        machineId,
        flagId: matchedFlag?.id || null,
        userId,
        teamId: teamId || null,
        submittedFlag,
        isCorrect: true,
        basePoints: machine.score,
        earnedPoints,
        attemptNumber,
        isFirstBlood,
        bloodBonus,
      },
    });

    // ScoreHistory에 기록
    await prisma.scoreHistory.create({
      data: {
        userId,
        type: 'MACHINE',
        basePoints: machine.score,
        earnedPoints,
        description: `Solved: ${machine.title}`,
        metadata: {
          machineId,
          machineName: machine.title,
          isFirstBlood,
          bloodRank,
          bloodBonus,
        },
      },
    });

    // User 총점/랭크 업데이트
    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          totalPoints: true,
          currentRank: true,
        },
      });

      if (!currentUser) {
        throw new Error('User not found');
      }

      const newTotalPoints = currentUser.totalPoints + earnedPoints;
      const newRank = calculateLimitedRank(
        currentUser.currentRank,
        newTotalPoints
      );

      await tx.user.update({
        where: { id: userId },
        data: {
          totalPoints: newTotalPoints,
          currentRank: newRank,
        },
      });
    });

    // EventLog 기록
    await prisma.eventLog.create({
      data: {
        type: isFirstBlood ? 'first_blood' : 'submission',
        userId,
        teamId: teamId || null,
        machineId,
        message: isFirstBlood
          ? `First Blood on ${machine.title}!`
          : `Solved ${machine.title}`,
        metadata: {
          earnedPoints,
          bloodBonus,
          bloodRank,
        },
      },
    });

    // 실시간 알림 전송
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (isFirstBlood && user) {
      await notifyFirstBlood(machineId, userId, machine.title, user.name);
    }

    if (user) {
      await notifyFlagSubmission(
        machineId,
        userId,
        true,
        machine.title,
        user.name
      );
    }
  } else {
    // 오답인 경우에도 기록
    await prisma.flagSubmission.create({
      data: {
        machineId,
        userId,
        teamId: teamId || null,
        submittedFlag,
        isCorrect: false,
        basePoints: machine.score,
        earnedPoints: 0,
        attemptNumber,
        isFirstBlood: false,
        bloodBonus: 0,
      },
    });
  }

  return {
    success: isCorrect,
    isCorrect,
    earnedPoints,
    bloodBonus,
    isFirstBlood,
    bloodRank,
    message: isCorrect
      ? isFirstBlood
        ? 'First Blood! 🩸'
        : `Correct! You earned ${earnedPoints} points.`
      : 'Incorrect flag. Try again.',
  };
}

/**
 * Machine의 First Blood 순위 가져오기
 */
export async function getFirstBloodRankings(machineId: string): Promise<
  Array<{
    rank: number;
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    earnedPoints: number;
    bloodBonus: number;
    submittedAt: Date;
  }>
> {
  const submissions = await prisma.flagSubmission.findMany({
    where: {
      machineId,
      isCorrect: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 3, // 처음 3명만
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return submissions.map((submission, index) => ({
    rank: index + 1,
    userId: submission.userId,
    userName: submission.user.name,
    teamId: submission.teamId,
    teamName: submission.team?.name || null,
    earnedPoints: submission.earnedPoints,
    bloodBonus: submission.bloodBonus,
    submittedAt: submission.createdAt,
  }));
}
