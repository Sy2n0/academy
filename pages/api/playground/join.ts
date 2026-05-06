import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const ensureEnrollmentTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlaygroundEnrollment" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "playgroundId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlaygroundEnrollment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PlaygroundEnrollment_playgroundId_fkey"
        FOREIGN KEY ("playgroundId") REFERENCES "PlaygroundSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PlaygroundEnrollment_userId_playgroundId_key" UNIQUE ("userId", "playgroundId")
    );
  `);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      if (req.method === 'GET') {
        return res.status(200).json({ data: { enrolled: false } });
      }
      return res.status(401).json({ error: { message: '로그인이 필요합니다.' } });
    }

    const playground = await prisma.playgroundSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    }) || await prisma.playgroundSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!playground) {
      if (req.method === 'GET') {
        return res.status(200).json({ data: { enrolled: false } });
      }
      return res.status(404).json({ error: { message: '활성 Playground를 찾을 수 없습니다.' } });
    }

    await ensureEnrollmentTable();

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "PlaygroundEnrollment"
      WHERE "userId" = ${user.id} AND "playgroundId" = ${playground.id}
      LIMIT 1
    `;

    if (req.method === 'GET') {
      return res.status(200).json({
        data: {
          enrolled: existing.length > 0,
          playgroundId: playground.id,
          playgroundName: playground.name,
        },
      });
    }

    if (existing.length > 0) {
      return res.status(200).json({
        data: {
          enrolled: true,
          alreadyEnrolled: true,
          playgroundId: playground.id,
          playgroundName: playground.name,
          message: '이미 참가 신청이 완료되었습니다.',
        },
      });
    }

    const created = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
      INSERT INTO "PlaygroundEnrollment" ("id", "userId", "playgroundId")
      VALUES (md5(random()::text || clock_timestamp()::text || ${user.id} || ${playground.id}), ${user.id}, ${playground.id})
      ON CONFLICT ("userId", "playgroundId") DO NOTHING
      RETURNING "id", "createdAt"
    `;

    if (created.length === 0) {
      return res.status(200).json({
        data: {
          enrolled: true,
          alreadyEnrolled: true,
          playgroundId: playground.id,
          playgroundName: playground.name,
          message: '이미 참가 신청이 완료되었습니다.',
        },
      });
    }

    return res.status(200).json({
      data: {
        enrolled: true,
        alreadyEnrolled: false,
        enrollmentId: created[0].id,
        enrolledAt: created[0].createdAt,
        playgroundId: playground.id,
        playgroundName: playground.name,
        message: '참가 신청이 완료되었습니다.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '참가 신청 처리 중 오류가 발생했습니다.';
    return res.status(500).json({ error: { message } });
  }
}
