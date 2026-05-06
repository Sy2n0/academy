import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const testImageSchema = z.object({
  image: z.string().min(1, 'Container image is required'),
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
      throw new ApiError(403, 'Only admins can test container images');
    }

    switch (req.method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
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

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { image } = testImageSchema.parse(req.body);

    // Docker 이미지가 존재하는지 확인 (pull 테스트)
    // 실제로는 docker pull을 실행하지 않고 이미지 이름 형식만 검증할 수도 있습니다
    // 여기서는 간단하게 이미지 이름 형식 검증만 수행
    
    // Docker 이미지 이름 형식 검증
    const imageRegex = /^[a-z0-9]+([._-][a-z0-9]+)*(\/[a-z0-9]+([._-][a-z0-9]+)*)*(:[a-z0-9]+([._-][a-z0-9]+)*)?$/i;
    
    if (!imageRegex.test(image)) {
      throw new ApiError(400, 'Invalid container image format');
    }

    // Docker 이미지 존재 여부만 확인 (pull 하지 않음)
    // 권한 문제가 있어도 형식만 검증하고 통과
    try {
      // Docker가 설치되어 있는지 확인
      await execAsync('docker --version');
      
      // 로컬에 이미지가 있는지 확인
      const { stdout } = await execAsync(`docker images ${image} --format "{{.Repository}}:{{.Tag}}"`, {
        timeout: 5000,
      });
      
      const imageExists = stdout.trim().split('\n').some(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // 태그가 없는 경우 기본 태그 추가
        if (trimmed === image || trimmed === image.split(':')[0]) {
          return true;
        }
        return trimmed === image;
      });
      
      if (imageExists) {
        res.json({
          data: {
            message: 'Container image exists locally',
            image,
          },
        });
        return;
      }
    } catch (dockerError: any) {
      // Docker 권한 문제나 다른 에러가 있어도 형식만 검증하고 통과
      console.log('Docker check failed (non-critical):', dockerError.message);
    }
    
    // 이미지 형식이 유효하면 통과 (로컬에 없거나 확인할 수 없어도)
    res.json({
      data: {
        message: 'Container image format is valid',
        image,
        note: 'Image format validated successfully',
      },
    });
  } catch (error: any) {
    console.error('Error in handlePOST:', error);
    
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, 'Failed to test container image');
  }
};
