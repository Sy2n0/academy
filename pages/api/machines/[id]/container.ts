import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import {
  createContainerInstance,
  stopContainerInstance,
} from 'models/container';
import { prisma } from '@/lib/prisma';
import { isVpnConnected, isVpnRequired } from '@/lib/vpn';
import { buildConnection, resolveProtocol } from '@/lib/machine-connection';

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
  const [instance, machine] = await Promise.all([
    prisma.containerInstance.findFirst({
      where: {
        machineId,
        userId,
        status: 'running',
      },
      orderBy: {
        startedAt: 'desc',
      },
    }),
    prisma.machine.findUnique({
      where: { id: machineId },
      select: { serviceProtocol: true, category: true, servicePort: true },
    }),
  ]);

  if (!instance) {
    res.json({
      data: {
        message: 'No running container instance found',
      },
    });
    return;
  }

  // The address is withheld while the tunnel is down. A machine already
  // running is still the user's — this only declines to hand out a target they
  // cannot reach, and says why.
  const reachable = !isVpnRequired() || (await isVpnConnected(userId));
  const ports = instance.ports as Record<string, number> | null;

  res.json({
    data: {
      instance: {
        id: instance.id,
        ipAddress: reachable ? instance.ipAddress : null,
        ports: reachable ? ports : null,
        status: instance.status,
        vpnRequired: !reachable,
        connection:
          reachable && machine
            ? connectionFor(machine, instance.ipAddress, ports)
            : null,
        createdAt: instance.startedAt.toISOString(),
      },
    },
  });
};

/** Assembles the address a student can copy, or null if there is nothing to reach. */
function connectionFor(
  machine: {
    serviceProtocol: string | null;
    category: string;
    servicePort: number | null;
  },
  host: string | null,
  ports: Record<string, number> | null
) {
  if (!host) return null;

  // Prefer the port the service actually listens on; fall back to whatever
  // single mapping exists, since that is what a one-port machine reports.
  const port =
    machine.servicePort ??
    (ports ? Number(Object.values(ports)[0]) : undefined);
  if (!port || Number.isNaN(port)) return null;

  return buildConnection(
    host,
    port,
    resolveProtocol(machine.serviceProtocol, machine.category)
  );
}

// 컨테이너 생성
const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string,
  userId: string
) => {
  const { teamId } = req.body;

  // Refused before the container is created rather than after: the machine is
  // only routable from inside the tunnel, so starting one for a user who cannot
  // reach it just burns the slot and leaves them staring at a dead address.
  if (isVpnRequired() && !(await isVpnConnected(userId))) {
    throw new ApiError(403, 'VPN에 연결한 뒤 머신을 시작할 수 있습니다');
  }

  const instance = await createContainerInstance(
    machineId,
    userId,
    teamId || null
  );

  // Returned on creation too, so the page can show the address immediately
  // rather than waiting for the next poll to fill it in.
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: { serviceProtocol: true, category: true, servicePort: true },
  });

  res.json({
    data: {
      message: 'Container instance created successfully',
      instance: {
        id: instance.id,
        ipAddress: instance.ipAddress,
        ports: instance.ports,
        connection: machine
          ? connectionFor(
              machine,
              instance.ipAddress,
              instance.ports as Record<string, number> | null
            )
          : null,
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
    throw new ApiError(
      403,
      'You do not have permission to stop this container'
    );
  }

  await stopContainerInstance(instanceId);

  res.json({
    data: {
      message: 'Container instance stopped successfully',
    },
  });
};
