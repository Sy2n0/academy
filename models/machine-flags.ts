import { prisma } from '@/lib/prisma';
import { MachineType } from '@prisma/client';
import crypto from 'crypto';

/**
 * 정적 플래그 생성 (정적 첨부/컨테이너용)
 */
export async function createStaticFlags(
  machineId: string,
  flags: string[]
): Promise<void> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
  });

  if (!machine) {
    throw new Error('Machine not found');
  }

  if (
    machine.type !== MachineType.STATIC_ATTACHMENT &&
    machine.type !== MachineType.STATIC_CONTAINER
  ) {
    throw new Error('Machine type does not support static flags');
  }

  // Machine의 staticFlags 업데이트
  await prisma.machine.update({
    where: { id: machineId },
    data: {
      staticFlags: flags,
    },
  });

  // 정적 플래그는 MachineFlag에 저장하지 않음
  // Machine의 staticFlags 배열에만 저장됨
  // 동적 플래그만 MachineFlag에 저장됨
}

/**
 * 동적 플래그 생성 (동적 첨부/컨테이너용)
 * 팀별 또는 사용자별로 고유한 플래그 생성
 */
export async function generateDynamicFlags(
  machineId: string,
  teamIds: string[],
  flagTemplate?: string
): Promise<Array<{ teamId: string; flag: string }>> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
  });

  if (!machine) {
    throw new Error('Machine not found');
  }

  if (
    machine.type !== MachineType.DYNAMIC_ATTACHMENT &&
    machine.type !== MachineType.DYNAMIC_CONTAINER
  ) {
    throw new Error('Machine type does not support dynamic flags');
  }

  const template = flagTemplate || machine.flagTemplate || 'flag{xxx}';
  const generatedFlags: Array<{ teamId: string; flag: string }> = [];

  for (const teamId of teamIds) {
    // 고유한 플래그 생성
    const randomPart = crypto.randomBytes(16).toString('hex');
    const flag = template.replace('xxx', randomPart);

    const existingFlag = await prisma.machineFlag.findFirst({
      where: {
        machineId,
        teamId,
        userId: null,
      },
    });

    if (existingFlag) {
      await prisma.machineFlag.update({
        where: { id: existingFlag.id },
        data: { flag },
      });
    } else {
      await prisma.machineFlag.create({
        data: {
          machineId,
          teamId,
          flag,
          isStatic: false,
        },
      });
    }

    generatedFlags.push({ teamId, flag });
  }

  return generatedFlags;
}

/**
 * 사용자별 동적 플래그 생성
 */
export async function generateUserDynamicFlags(
  machineId: string,
  userIds: string[],
  flagTemplate?: string
): Promise<Array<{ userId: string; flag: string }>> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
  });

  if (!machine) {
    throw new Error('Machine not found');
  }

  const template = flagTemplate || machine.flagTemplate || 'flag{xxx}';
  const generatedFlags: Array<{ userId: string; flag: string }> = [];

  for (const userId of userIds) {
    const randomPart = crypto.randomBytes(16).toString('hex');
    const flag = template.replace('xxx', randomPart);

    const existingFlag = await prisma.machineFlag.findFirst({
      where: {
        machineId,
        teamId: null,
        userId,
      },
    });

    if (existingFlag) {
      await prisma.machineFlag.update({
        where: { id: existingFlag.id },
        data: { flag },
      });
    } else {
      await prisma.machineFlag.create({
        data: {
          machineId,
          userId,
          flag,
          isStatic: false,
        },
      });
    }

    generatedFlags.push({ userId, flag });
  }

  return generatedFlags;
}

/**
 * Machine의 플래그 목록 가져오기 (관리자용 - 사용자/팀 정보 포함)
 */
export async function getMachineFlags(machineId: string, includeUserInfo: boolean = false): Promise<
  Array<{
    id: string;
    flag: string;
    teamId: string | null;
    userId: string | null;
    isStatic: boolean;
    createdAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
    team?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>
> {
  // Machine 정보 가져오기 (staticFlags 포함)
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: {
      staticFlags: true,
    },
  });

  // 동적 플래그 가져오기 (MachineFlag에서)
  const dynamicFlags = await prisma.machineFlag.findMany({
    where: { machineId },
    select: {
      id: true,
      flag: true,
      teamId: true,
      userId: true,
      isStatic: true,
      createdAt: true,
      ...(includeUserInfo && {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 정적 플래그를 MachineFlag 형식으로 변환
  const staticFlags = (machine?.staticFlags || []).map((flag, index) => ({
    id: `static-${machineId}-${index}`,
    flag,
    teamId: null,
    userId: null,
    isStatic: true,
    createdAt: new Date(), // 정적 플래그는 생성 시간을 정확히 알 수 없으므로 현재 시간 사용
    ...(includeUserInfo && {
      user: null,
      team: null,
    }),
  }));

  // 정적 플래그와 동적 플래그 합치기
  return [...staticFlags, ...dynamicFlags];
}

/**
 * 플래그 공유 감지 (같은 플래그를 여러 사용자가 제출한 경우)
 */
export async function detectFlagSharing(
  machineId: string,
  flag: string
): Promise<{
  isShared: boolean;
  submissionCount: number;
  users: Array<{ userId: string; userName: string; submittedAt: Date }>;
}> {
  const submissions = await prisma.flagSubmission.findMany({
    where: {
      machineId,
      submittedFlag: flag,
      isCorrect: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const uniqueUsers = new Map<string, { userId: string; userName: string; submittedAt: Date }>();
  submissions.forEach(sub => {
    if (!uniqueUsers.has(sub.userId)) {
      uniqueUsers.set(sub.userId, {
        userId: sub.userId,
        userName: sub.user.name,
        submittedAt: sub.createdAt,
      });
    }
  });

  return {
    isShared: uniqueUsers.size > 1,
    submissionCount: submissions.length,
    users: Array.from(uniqueUsers.values()),
  };
}
