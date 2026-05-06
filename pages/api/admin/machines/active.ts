import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createStaticFlags } from 'models/machine-flags';
import { MachineType } from '@prisma/client';

const createMachineSchema = z.object({
  title: z.string().min(1, 'Machine title is required'),
  description: z.string().optional().nullable(),
  type: z.enum(['STATIC_ATTACHMENT', 'DYNAMIC_ATTACHMENT', 'STATIC_CONTAINER', 'DYNAMIC_CONTAINER']),
  category: z.string().min(1, 'Category is required'),
  maxAttempts: z.number().int().min(0).nullable().optional(),
  score: z.number().int().min(0, 'Score must be a positive number').optional(),
  difficultyFactor: z.number().min(0, 'Difficulty factor must be positive').optional(),
  minimumScoreRatio: z.number().int().min(0).max(100, 'Minimum score ratio must be between 0 and 100').optional(),
  bloodBonus: z.boolean().default(false).optional(),
  containerImage: z.string().optional().nullable(),
  servicePort: z.number().int().min(1).max(65535).nullable().optional(),
  cpuLimit: z.number().int().min(1).nullable().optional(),
  memoryLimit: z.number().int().min(1).nullable().optional(),
  storageLimit: z.number().int().min(1).nullable().optional(),
  enableTrafficCapture: z.boolean().default(false).optional(),
  hints: z.array(z.string()).default([]).optional(),
  categoryType: z.string().default('active').optional(),
  attachmentUrl: z.string().optional().nullable(),
  flagTemplate: z.string().optional().nullable(),
  staticFlags: z.array(z.string()).default([]).optional(),
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

    // 관리자만 접근 가능
    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can create machines');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res);
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

// Get all active machines
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (!prisma || !prisma.machine) {
      throw new ApiError(500, 'Machine model is not available. Please restart the server.');
    }

    // 모든 Machine 조회 (디버깅용)
    const allMachines = await prisma.machine.findMany();
    console.log('Total machines in DB:', allMachines.length);
    console.log('All machines categoryType:', allMachines.map(m => ({ id: m.id, title: m.title, categoryType: m.categoryType })));

    const machines = await prisma.machine.findMany({
      where: {
        categoryType: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Filtered active machines:', machines.length);

    res.json({
      data: {
        machines: machines.map(machine => ({
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
          storageLimit: machine.storageLimit,
          enableTrafficCapture: machine.enableTrafficCapture,
          categoryType: machine.categoryType,
          isActive: machine.isActive,
          createdAt: machine.createdAt.toISOString(),
          updatedAt: machine.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    console.error('Error in handleGET:', error);
    throw error;
  }
};

// Create a new active machine
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const validatedData = createMachineSchema.parse(req.body);

    // Prisma 클라이언트 확인
    if (!prisma) {
      throw new ApiError(500, 'Prisma client is not initialized');
    }

    if (!prisma.machine) {
      throw new ApiError(500, 'Machine model is not available. Please restart the server.');
    }

    // DB에 Machine 저장
    const machine = await prisma.machine.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        type: validatedData.type,
        category: validatedData.category,
        maxAttempts: validatedData.maxAttempts ?? null,
        score: validatedData.score ?? 1000,
        difficultyFactor: validatedData.difficultyFactor ?? 5.0,
        minimumScoreRatio: validatedData.minimumScoreRatio ?? 20,
        bloodBonus: validatedData.bloodBonus ?? false,
        containerImage: validatedData.containerImage || null,
        servicePort: validatedData.servicePort ?? null,
        cpuLimit: validatedData.cpuLimit ?? null,
        memoryLimit: validatedData.memoryLimit ?? null,
        storageLimit: validatedData.storageLimit ?? null,
        enableTrafficCapture: validatedData.enableTrafficCapture ?? false,
        hints: validatedData.hints || [],
        categoryType: validatedData.categoryType || 'active',
        attachmentUrl: validatedData.attachmentUrl || null,
        flagTemplate: validatedData.flagTemplate || null,
        staticFlags: validatedData.staticFlags || [],
        isActive: true,
      },
    });

    // Static flags 자동 생성 (정적 타입이고 staticFlags가 있는 경우)
    if (
      (validatedData.type === MachineType.STATIC_ATTACHMENT ||
        validatedData.type === MachineType.STATIC_CONTAINER) &&
      validatedData.staticFlags &&
      validatedData.staticFlags.length > 0
    ) {
      try {
        await createStaticFlags(machine.id, validatedData.staticFlags);
      } catch (flagError: any) {
        console.error('Error creating static flags:', flagError);
        // 플래그 생성 실패해도 Machine 생성은 성공으로 처리
      }
    }

    res.json({
      data: {
        message: 'Active Machine created successfully',
        machine: {
          id: machine.id,
          title: machine.title,
          description: machine.description,
          type: machine.type,
          category: machine.category,
          score: machine.score,
          createdAt: machine.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in handlePOST:', error);
    
    // Zod validation error
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }
    
    // Prisma error
    if (error.code === 'P2002') {
      throw new ApiError(409, 'A machine with this configuration already exists');
    }
    
    throw error;
  }
};
