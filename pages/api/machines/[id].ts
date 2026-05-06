import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ScoreType } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res, id as string);
        break;
      default:
        res.setHeader('Allow', 'GET');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    if (!res.headersSent) {
      res.status(status).json({ error: { message } });
    }
  }
}

const handleGET = async (req: NextApiRequest, res: NextApiResponse, id: string) => {
  if (!id) {
    res.status(400).json({ error: { message: 'Machine ID is required' } });
    return;
  }

  // Machine 정보 가져오기
  const machine = await prisma.machine.findUnique({
    where: {
      id,
      categoryType: 'active',
      isActive: true,
    },
  });

  if (!machine) {
    res.status(404).json({ error: { message: 'Machine not found' } });
    return;
  }

  // Machine 관련 ScoreHistory 가져오기
  const machineScores = await prisma.scoreHistory.findMany({
    where: {
      type: ScoreType.MACHINE,
    },
    select: {
      metadata: true,
      createdAt: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 사용자 정보 가져오기
  const userIds = Array.from(new Set(machineScores.map((s) => s.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  // 통계 계산
  let solvedCount = 0;
  let firstBlood: string | undefined;
  let lastSolved: string | undefined;

  const machineTitleMap = new Map([[machine.id, machine.title]]);

  machineScores.forEach((score) => {
    let matched = false;

    // metadata에서 machineId 추출
    if (score.metadata && typeof score.metadata === 'object' && 'machineId' in score.metadata) {
      const machineId = score.metadata.machineId as string;
      if (machineId === id) {
        matched = true;
      }
    }

    // description에서 machine title로 매칭
    if (!matched && score.metadata && typeof score.metadata === 'object' && 'description' in score.metadata) {
      const description = score.metadata.description as string;
      if (description && (description.includes(machine.title) || machine.title.includes(description))) {
        matched = true;
      }
    }

    if (matched) {
      solvedCount += 1;

      // First Blood 확인
      if (score.metadata && typeof score.metadata === 'object' && 'firstBlood' in score.metadata) {
        const isFirstBlood = score.metadata.firstBlood === true || score.metadata.firstBlood === 'true';
        if (isFirstBlood && !firstBlood) {
          firstBlood = userMap.get(score.userId) || 'Unknown';
        }
      }

      // 가장 최근 해결 시간 업데이트
      if (!lastSolved || new Date(score.createdAt) > new Date(lastSolved)) {
        lastSolved = score.createdAt.toISOString();
      }
    }
  });

  res.status(200).json({
    data: {
      machine: {
        id: machine.id,
        title: machine.title,
        description: machine.description,
        type: machine.type,
        category: machine.category,
        maxAttempts: machine.maxAttempts,
        score: machine.score,
        difficultyFactor: machine.difficultyFactor,
        minimumScoreRatio: machine.minimumScoreRatio,
        bloodBonus: machine.bloodBonus,
        containerImage: machine.containerImage,
        servicePort: machine.servicePort,
        cpuLimit: machine.cpuLimit,
        memoryLimit: machine.memoryLimit,
        attachmentUrl: machine.attachmentUrl,
        solvedCount,
        firstBlood,
        lastSolved,
        createdAt: machine.createdAt.toISOString(),
        updatedAt: machine.updatedAt.toISOString(),
      },
    },
  });
};
