import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import {
  createStaticFlags,
  generateDynamicFlags,
  generateUserDynamicFlags,
  getMachineFlags,
} from 'models/machine-flags';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createStaticFlagsSchema = z.object({
  flags: z.array(z.string().min(1)).min(1, 'At least one flag is required'),
});

const generateDynamicFlagsSchema = z.object({
  teamIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  flagTemplate: z.string().optional(),
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

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can manage flags');
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Machine ID is required');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(req, res, id);
        break;
      case 'POST':
        await handlePOST(req, res, id);
        break;
      case 'DELETE':
        await handleDELETE(req, res, id);
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

// 플래그 목록 가져오기
const handleGET = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string
) => {
  // 관리자는 사용자/팀 정보 포함
  const flags = await getMachineFlags(machineId, true);

  res.json({
    data: { flags },
  });
};

// 플래그 생성
const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string
) => {
  const { flags, flagTemplate, action } = req.body;

  // flags 배열이 있고 비어있지 않으면 static flags로 처리
  if (flags && Array.isArray(flags) && flags.length > 0) {
    const validatedFlags = createStaticFlagsSchema.parse({ flags });
    await createStaticFlags(machineId, validatedFlags.flags);

    // flagTemplate도 함께 업데이트 (제공된 경우)
    if (flagTemplate && typeof flagTemplate === 'string' && flagTemplate.trim()) {
      await prisma.machine.update({
        where: { id: machineId },
        data: { flagTemplate: flagTemplate.trim() },
      });
    }

    res.json({
      data: {
        message: 'Static flags created successfully',
        count: validatedFlags.flags.length,
      },
    });
    return;
  }

  // flagTemplate만 제공된 경우 머신의 flagTemplate 업데이트
  if (flagTemplate && typeof flagTemplate === 'string' && flagTemplate.trim()) {
    await prisma.machine.update({
      where: { id: machineId },
      data: { flagTemplate: flagTemplate.trim() },
    });

    res.json({
      data: {
        message: 'Flag template updated successfully',
      },
    });
    return;
  }

  // action 기반 로직 (하위 호환성)
  if (action === 'create-static') {
    const { flags } = createStaticFlagsSchema.parse(req.body);
    await createStaticFlags(machineId, flags);

    res.json({
      data: {
        message: 'Static flags created successfully',
        count: flags.length,
      },
    });
    return;
  }

  if (action === 'generate-dynamic') {
    const { teamIds, userIds, flagTemplate } = generateDynamicFlagsSchema.parse(req.body);

    if (teamIds && teamIds.length > 0) {
      const generated = await generateDynamicFlags(machineId, teamIds, flagTemplate);
      res.json({
        data: {
          message: 'Dynamic flags generated for teams successfully',
          flags: generated,
        },
      });
      return;
    } else if (userIds && userIds.length > 0) {
      const generated = await generateUserDynamicFlags(machineId, userIds, flagTemplate);
      res.json({
        data: {
          message: 'Dynamic flags generated for users successfully',
          flags: generated,
        },
      });
      return;
    } else {
      throw new ApiError(400, 'Either teamIds or userIds must be provided');
    }
  }

  // flags 배열이 비어있거나 action이 없는 경우
  throw new ApiError(400, 'Please provide flags or a flag template');
};

// 플래그 삭제
const handleDELETE = async (
  req: NextApiRequest,
  res: NextApiResponse,
  machineId: string
) => {
  const { flagId } = req.body;

  if (!flagId || typeof flagId !== 'string') {
    throw new ApiError(400, 'Flag ID is required');
  }

  // 정적 플래그인 경우 (ID가 static-으로 시작)
  if (flagId.startsWith('static-')) {
    // Machine의 staticFlags 배열에서 제거
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { staticFlags: true },
    });

    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    // flagId에서 index 추출 (static-{machineId}-{index} 형식)
    // 예: static-1d37512e-1eaa-4420-baba-678596fd21cf-0
    const parts = flagId.split('-');
    if (parts.length < 3) {
      throw new ApiError(400, 'Invalid static flag ID format');
    }
    
    // 마지막 부분이 index
    const index = parseInt(parts[parts.length - 1], 10);
    
    if (isNaN(index) || index < 0 || index >= machine.staticFlags.length) {
      throw new ApiError(400, 'Invalid flag index');
    }

    const updatedFlags = machine.staticFlags.filter((_, i) => i !== index);

    await prisma.machine.update({
      where: { id: machineId },
      data: {
        staticFlags: updatedFlags,
      },
    });

    res.json({
      data: {
        message: 'Static flag deleted successfully',
      },
    });
    return;
  }

  // 동적 플래그인 경우 MachineFlag에서 삭제
  const flag = await prisma.machineFlag.findUnique({
    where: { id: flagId },
  });

  if (!flag) {
    throw new ApiError(404, 'Flag not found');
  }

  if (flag.machineId !== machineId) {
    throw new ApiError(400, 'Flag does not belong to this machine');
  }

  await prisma.machineFlag.delete({
    where: { id: flagId },
  });

  res.json({
    data: {
      message: 'Flag deleted successfully',
    },
  });
};
