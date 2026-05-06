import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { createContainerInstance, stopContainerInstance } from 'models/container';
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

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Machine ID is required');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(req, res, id, currentUser.id);
        break;
      case 'POST':
        await handlePOST(req, res, id, currentUser.id);
        break;
      case 'DELETE':
        await handleDELETE(req, res, id, currentUser.id);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, DELETE');
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

// 컨테이너 인스턴스 조회
const handleGET = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string,
  userId: string
) => {
  // 사용자의 활성 컨테이너 인스턴스 조회
  const instance = await prisma.containerInstance.findFirst({
    where: {
      machineId,
      userId,
      status: 'running',
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  if (!instance) {
    res.json({
      data: {
        message: 'No running container instance found',
      },
    });
    return;
  }

  res.json({
    data: {
      instance: {
        id: instance.id,
        ipAddress: instance.ipAddress,
        ports: instance.ports as Record<string, number>,
        status: instance.status,
        createdAt: instance.startedAt.toISOString(),
      },
    },
  });
};

// 컨테이너 생성
const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string,
  userId: string
) => {
  const { teamId } = req.body;

  const instance = await createContainerInstance(
    machineId,
    userId,
    teamId || null
  );

  res.json({
    data: {
      message: 'Container instance created successfully',
      instance: {
        id: instance.id,
        ipAddress: instance.ipAddress,
        ports: instance.ports,
        // 플래그는 클라이언트에 반환하지 않음 (보안)
      },
    },
  });
};

// 컨테이너 중지
const handleDELETE = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string,
  userId: string
) => {
  const { instanceId } = req.body;

  if (!instanceId) {
    throw new ApiError(400, 'Instance ID is required');
  }

  // 사용자가 소유한 인스턴스인지 확인
  const instance = await prisma.containerInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new ApiError(404, 'Container instance not found');
  }

  if (instance.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to stop this container');
  }

  await stopContainerInstance(instanceId);

  res.json({
    data: {
      message: 'Container instance stopped successfully',
    },
  });
};
