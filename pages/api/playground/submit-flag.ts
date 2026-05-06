import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { prisma } from '@/lib/prisma';
import { awardPoints } from 'models/score';
import { sendDiscordWebhook } from '@/lib/discord';
// Set your Discord webhook URL here or load from environment
const DISCORD_WEBHOOK_URL = process.env.DISCORD_FIRST_BLOOD_WEBHOOK_URL || '';
import { ScoreType } from '@prisma/client';
import crypto from 'crypto';

const normalize = (value: string) => value.trim().toLowerCase();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res.status(401).json({ error: { message: '로그인이 필요합니다.' } });
    }

    const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
    const submittedFlag = typeof req.body?.flag === 'string' ? req.body.flag : '';

    if (!challengeId || !submittedFlag.trim()) {
      return res.status(400).json({ error: { message: 'challengeId와 flag는 필수입니다.' } });
    }


    // Fetch challenge and its playground settings (for endDate)
    const challenge = await prisma.playgroundChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        title: true,
        flag: true,
        value: true,
        difficulty: true,
        category: true,
        playgroundCodeName: true,
        isActive: true,
      },
    });

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ error: { message: 'Challenge를 찾을 수 없습니다.' } });
    }

    // Fetch playground settings to check endDate
    const playgroundSettings = await prisma.playgroundSettings.findFirst({
      where: { codeName: challenge.playgroundCodeName },
      select: { endDate: true, name: true },
    });

    if (playgroundSettings && playgroundSettings.endDate) {
      const now = new Date();
      let endDate = new Date(playgroundSettings.endDate);
      // endDate가 시간까지 포함되어 있지 않으면(즉, 00:00:00이거나 09:00:00 등), 하루의 끝으로 보정
      if (
        playgroundSettings.endDate.length === 10 || // YYYY-MM-DD
        (endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0)
      ) {
        endDate.setHours(23, 59, 59, 999);
      }
      if (now > endDate) {
        return res.status(403).json({ error: { message: `이 Playground(${playgroundSettings.name})는 종료되어 제출할 수 없습니다.` } });
      }
    }

    const enrolledPlaygrounds = await prisma.playgroundEnrollment.findMany({
      where: { userId: user.id },
      select: {
        playground: {
          select: {
            codeName: true,
          },
        },
      },
    });

    const isEnrolled = enrolledPlaygrounds.some(
      (entry) => normalize(entry.playground.codeName || '') === normalize(challenge.playgroundCodeName || '')
    );

    if (!isEnrolled && !isAdmin(user.role)) {
      return res.status(403).json({ error: { message: '해당 Playground 참가자만 제출할 수 있습니다.' } });
    }

    const normalizedSubmittedFlag = submittedFlag.trim();
    const isCorrect = normalizedSubmittedFlag === challenge.flag;

    const attempts = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int as count
      FROM "PlaygroundFlagSubmission"
      WHERE "challengeId" = ${challenge.id}
        AND "userId" = ${user.id}
    `;
    const previousAttempts = attempts[0]?.count || 0;

    await prisma.$executeRaw`
      INSERT INTO "PlaygroundFlagSubmission"
      ("id", "challengeId", "userId", "playgroundCodeName", "challengeTitle", "submittedFlag", "isCorrect", "submissionMethod", "attemptNumber", "createdAt")
      VALUES
      (${crypto.randomUUID()}, ${challenge.id}, ${user.id}, ${challenge.playgroundCodeName}, ${challenge.title}, ${normalizedSubmittedFlag}, ${isCorrect}, ${'flag_input'}, ${previousAttempts + 1}, ${new Date()})
    `;

    if (!isCorrect) {
      return res.status(200).json({
        data: {
          correct: false,
          message: '틀렸습니다.',
        },
      });
    }

    const priorSolveForChallenge = await prisma.scoreHistory.findMany({
      where: {
        userId: user.id,
        type: ScoreType.PLAYGROUND,
      },
      select: {
        metadata: true,
      },
      take: 500,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const solvedBefore = priorSolveForChallenge.some((entry) => {
      if (!entry.metadata || typeof entry.metadata !== 'object') return false;
      const metadata = entry.metadata as Record<string, unknown>;
      return metadata.challengeId === challenge.id;
    });

    if (solvedBefore) {
      return res.status(200).json({
        data: {
          correct: true,
          alreadySolved: true,
          message: '이미 맞춘 문제입니다.',
        },
      });
    }

    const priorGlobalSolves = await prisma.scoreHistory.findMany({
      where: {
        type: ScoreType.PLAYGROUND,
      },
      select: {
        metadata: true,
      },
      take: 2000,
    });

    const firstBlood = !priorGlobalSolves.some((entry) => {
      if (!entry.metadata || typeof entry.metadata !== 'object') return false;
      const metadata = entry.metadata as Record<string, unknown>;
      return metadata.challengeId === challenge.id;
    });

    const result = await awardPoints(
      user.id,
      ScoreType.PLAYGROUND,
      challenge.value,
      'solved a challenge',
      {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        playgroundCodeName: challenge.playgroundCodeName,
        category: challenge.category,
        difficulty: challenge.difficulty,
        firstBlood,
      }
    );

    // Discord notification for first blood
    if (firstBlood && DISCORD_WEBHOOK_URL) {
      const discordMessage = `:drop_of_blood: **FIRST BLOOD!** :drop_of_blood:\n` +
        `Challenge: **${challenge.title}**\n` +
        `User: **${user.name}** (${user.email})`;
      sendDiscordWebhook(DISCORD_WEBHOOK_URL, discordMessage);
    }

    return res.status(200).json({
      data: {
        correct: true,
        alreadySolved: false,
        firstBlood,
        pointsEarned: result.pointsEarned,
        totalPoints: result.user.totalPoints,
        message: '정답입니다!',
      },
    });
  } catch (error) {
    console.error('Error submitting playground flag:', error);
    return res.status(500).json({ error: { message: 'Flag 제출 중 오류가 발생했습니다.' } });
  }
}
