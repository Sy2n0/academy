import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createWriteupSchema = z.object({
  machineId: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

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

    switch (req.method) {
      case 'GET':
        await handleGET(req, res, currentUser);
        break;
      case 'POST':
        await handlePOST(req, res, currentUser.id);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
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

// Writeup 목록 가져오기
const handleGET = async (
  req: NextApiRequest,
  res: NextApiResponse,
  currentUser: any
) => {
  const { status, machineId, userId } = req.query;
  const isAdminUser = isAdmin(currentUser.role);

  const where: any = {};

  // 관리자가 아니면 자신의 writeup만 볼 수 있음
  if (!isAdminUser) {
    where.userId = currentUser.id;
  } else {
    // 관리자는 필터링 가능
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (machineId && typeof machineId === 'string') {
      where.machineId = machineId;
    }
    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }
  }

  const writeups = await prisma.writeup.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    data: { writeups },
  });
};

// Writeup 생성
const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { machineId, title, content } = createWriteupSchema.parse(req.body);

  const writeup = await prisma.writeup.create({
    data: {
      userId,
      machineId: machineId || null,
      title,
      content,
      status: 'pending',
    },
  });

  res.json({
    data: {
      message: 'Writeup submitted successfully',
      writeup,
    },
  });
};
