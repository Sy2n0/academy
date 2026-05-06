import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { getSession } from '@/lib/session';
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { getUserBySession } from 'models/user';

type CreateTeamInput = {
  name: string;
  slug: string;
  userId: string;
  inviteCode?: string;
};

/**
 * 팀 생성
 */
export async function createTeam(
  name: string,
  slug: string,
  creatorId: string,
  inviteCode?: string
): Promise<any>;
export async function createTeam(input: CreateTeamInput): Promise<any>;
export async function createTeam(
  nameOrInput: string | CreateTeamInput,
  slugArg?: string,
  creatorIdArg?: string,
  inviteCodeArg?: string
): Promise<any> {
  const name = typeof nameOrInput === 'string' ? nameOrInput : nameOrInput.name;
  const slug = typeof nameOrInput === 'string' ? slugArg : nameOrInput.slug;
  const creatorId =
    typeof nameOrInput === 'string' ? creatorIdArg : nameOrInput.userId;
  const inviteCode =
    typeof nameOrInput === 'string' ? inviteCodeArg : nameOrInput.inviteCode;

  if (!name || !slug || !creatorId) {
    throw new ApiError(400, 'Invalid team creation payload.');
  }

  // 초대 코드 생성 (제공되지 않은 경우)
  const code = inviteCode || generateInviteCode();

  const team = await prisma.team.create({
    data: {
      name,
      slug,
      inviteCode: code,
      members: {
        create: {
          userId: creatorId,
          role: 'OWNER',
        },
      },
    },
  });

  return team;
}

/**
 * 초대 코드로 팀 가입
 */
export async function joinTeamByInviteCode(
  inviteCode: string,
  userId: string
): Promise<{
  teamId: string;
  teamName: string;
}> {
  const team = await prisma.team.findUnique({
    where: { inviteCode },
  });

  if (!team) {
    throw new Error('Invalid invite code');
  }

  // 이미 멤버인지 확인
  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new Error('You are already a member of this team');
  }

  // 팀 멤버 추가
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId,
      role: 'MEMBER',
    },
  });

  return {
    teamId: team.id,
    teamName: team.name,
  };
}

/**
 * 초대 코드 생성
 */
function generateInviteCode(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

/**
 * 팀별 점수 추이 가져오기
 */
export async function getTeamScoreHistory(
  teamId: string,
  limit: number = 100
): Promise<
  Array<{
    date: Date;
    totalPoints: number;
    machinePoints: number;
    trackPoints: number;
    playgroundPoints: number;
    solvedCount: number;
  }>
> {
  // 팀 멤버들의 점수 히스토리 집계
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });

  const userIds = teamMembers.map(m => m.userId);

  if (userIds.length === 0) {
    return [];
  }

  // 날짜별로 집계
  const scoreHistory = await prisma.scoreHistory.findMany({
    where: {
      userId: { in: userIds },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit * 10, // 충분한 데이터 가져오기
  });

  // 날짜별로 그룹화
  const dailyScores = new Map<string, {
    date: Date;
    machinePoints: number;
    trackPoints: number;
    playgroundPoints: number;
    solvedCount: number;
  }>();

  scoreHistory.forEach(score => {
    const dateKey = score.createdAt.toISOString().split('T')[0];
    
    if (!dailyScores.has(dateKey)) {
      dailyScores.set(dateKey, {
        date: new Date(dateKey),
        machinePoints: 0,
        trackPoints: 0,
        playgroundPoints: 0,
        solvedCount: 0,
      });
    }

    const daily = dailyScores.get(dateKey)!;
    
    if (score.type === 'MACHINE') {
      daily.machinePoints += score.earnedPoints;
    } else if (score.type === 'TRACK') {
      daily.trackPoints += score.earnedPoints;
    } else if (score.type === 'PLAYGROUND') {
      daily.playgroundPoints += score.earnedPoints;
    }
    
    daily.solvedCount += 1;
  });

  // 누적 점수 계산
  let cumulativeMachine = 0;
  let cumulativeTrack = 0;
  let cumulativePlayground = 0;
  let cumulativeTotal = 0;

  const result = Array.from(dailyScores.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(daily => {
      cumulativeMachine += daily.machinePoints;
      cumulativeTrack += daily.trackPoints;
      cumulativePlayground += daily.playgroundPoints;
      cumulativeTotal = cumulativeMachine + cumulativeTrack + cumulativePlayground;

      return {
        date: daily.date,
        totalPoints: cumulativeTotal,
        machinePoints: cumulativeMachine,
        trackPoints: cumulativeTrack,
        playgroundPoints: cumulativePlayground,
        solvedCount: daily.solvedCount,
      };
    })
    .slice(-limit); // 최근 N개만 반환

  return result;
}

/**
 * 팀 정보 가져오기
 */
export async function getTeam(teamId: string): Promise<any>;
export async function getTeam(key: { id?: string; slug?: string }): Promise<any>;
export async function getTeam(teamKey: string | { id?: string; slug?: string }) {
  const where =
    typeof teamKey === 'string'
      ? { id: teamKey }
      : teamKey.id
        ? { id: teamKey.id }
        : teamKey.slug
          ? { slug: teamKey.slug }
          : null;

  if (!where) {
    return null;
  }

  const team = await prisma.team.findUnique({
    where,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              totalPoints: true,
            },
          },
        },
      },
    },
  });

  return team;
}

/**
 * 사용자의 팀 목록 가져오기
 */
export async function getUserTeams(userId: string) {
  const teamMembers = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          inviteCode: true,
          createdAt: true,
        },
      },
    },
  });

  return teamMembers.map(tm => ({
    ...tm.team,
    role: tm.role,
    joinedAt: tm.createdAt,
  }));
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: Role = Role.MEMBER
) {
  return await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    update: {
      role,
    },
    create: {
      teamId,
      userId,
      role,
    },
  });
}

export async function removeTeamMember(teamId: string, userId: string) {
  const teamMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    return null;
  }

  await prisma.teamMember.delete({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  return teamMember;
}

export async function isTeamExists(slug: string) {
  return await prisma.team.count({
    where: {
      slug,
    },
  });
}

export async function getTeams(userId: string) {
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      userId,
    },
    include: {
      team: true,
    },
  });

  return teamMembers.map((teamMember) => teamMember.team);
}

export async function getByCustomerId(customerId: string) {
  return await prisma.team.findFirst({
    where: {
      billingId: customerId,
    },
  });
}

export async function getTeamMembers(teamSlug: string) {
  return await prisma.teamMember.findMany({
    where: {
      team: {
        slug: teamSlug,
      },
    },
    include: {
      user: true,
      team: true,
    },
  });
}

export async function getTeamMember(userId: string, teamSlug: string) {
  return await prisma.teamMember.findFirstOrThrow({
    where: {
      userId,
      team: {
        slug: teamSlug,
      },
    },
    include: {
      user: true,
      team: true,
    },
  });
}

export async function updateTeam(slug: string, data) {
  return await prisma.team.update({
    where: {
      slug,
    },
    data,
  });
}

export async function deleteTeam(key: { id: string } | { slug: string }) {
  return await prisma.team.delete({
    where: key,
  });
}

export async function getCurrentUserWithTeam(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  const user = await getUserBySession(session);

  if (!user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const slugParam = req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug) {
    throw new ApiError(400, 'Invalid team slug.');
  }

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId: user.id,
      team: {
        slug,
      },
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(403, 'You do not have access to this team.');
  }

  return teamMember;
}

export async function throwIfNoTeamAccess(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return await getCurrentUserWithTeam(req, res);
}
