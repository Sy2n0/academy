import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can access this resource');
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Machine ID is required');
    }

    if (req.method === 'GET') {
      const machine = await prisma.machine.findUnique({
        where: { id },
      });

      if (!machine) {
        throw new ApiError(404, 'Machine not found');
      }

      // Solved count 계산
      const solvedCount = await prisma.flagSubmission.count({
        where: {
          machineId: id,
          isCorrect: true,
        },
      });

      // First blood 찾기
      const firstBlood = await prisma.flagSubmission.findFirst({
        where: {
          machineId: id,
          isCorrect: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      // Last solved 찾기
      const lastSolved = await prisma.flagSubmission.findFirst({
        where: {
          machineId: id,
          isCorrect: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        data: {
          machine: {
            ...machine,
            solvedCount,
            firstBlood: firstBlood?.user?.name || null,
            lastSolved: lastSolved?.createdAt || null,
          },
        },
      });
    } else if (req.method === 'PATCH') {
      const {
        title,
        description,
        category,
        maxAttempts,
        score,
        difficultyFactor,
        minimumScoreRatio,
        bloodBonus,
        containerImage,
        servicePort,
        cpuLimit,
        memoryLimit,
        storageLimit,
        enableTrafficCapture,
        isActive,
        attachmentUrl,
        type,
      } = req.body;

      const machine = await prisma.machine.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(category && { category }),
          ...(maxAttempts !== undefined && { maxAttempts }),
          ...(score !== undefined && { score }),
          ...(difficultyFactor !== undefined && { difficultyFactor }),
          ...(minimumScoreRatio !== undefined && { minimumScoreRatio }),
          ...(bloodBonus !== undefined && { bloodBonus }),
          ...(containerImage !== undefined && { containerImage }),
          ...(servicePort !== undefined && { servicePort }),
          ...(cpuLimit !== undefined && { cpuLimit }),
          ...(memoryLimit !== undefined && { memoryLimit }),
          ...(storageLimit !== undefined && { storageLimit }),
          ...(attachmentUrl !== undefined && { attachmentUrl }),
          ...(type && { type }),
          ...(enableTrafficCapture !== undefined && { enableTrafficCapture }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.status(200).json({
        data: { machine },
      });
    } else if (req.method === 'DELETE') {
      await prisma.machine.delete({
        where: { id },
      });

      res.status(200).json({
        data: { message: 'Machine deleted successfully' },
      });
    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
