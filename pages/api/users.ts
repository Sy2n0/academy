import { getSession } from '@/lib/session';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import { ApiError } from '@/lib/errors';
import { updateUser, deleteUser } from 'models/user';
import { updateAccountSchema, validateWithSchema } from '@/lib/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
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

const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const data = validateWithSchema(updateAccountSchema, req.body);

  const session = await getSession(req, res);

  if ('email' in data) {
    throw new ApiError(400, '이메일 변경은 비활성화되어 있습니다.');
  }

  await updateUser({
    where: { id: session?.user.id },
    data,
  });

  recordMetric('user.updated');

  res.status(204).end();
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // 사용자 삭제 (Cascade로 관련 데이터 자동 삭제)
  await deleteUser({ id: session.user.id });

  recordMetric('user.deleted');

  res.status(204).end();
};
