import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

/**
 * GET: 현재 사용자의 Cloud IDE 세션 (새로고침 후 복원용)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const sessionModel = (prisma as any).cloudIDESession as
    | {
        findUnique?: (args: { where: { userId: string } }) => Promise<{
          containerName: string;
          host: string;
          port: number;
          password: string;
        } | null>;
      }
    | undefined;
  if (!sessionModel?.findUnique) {
    return res.status(200).json({ data: null });
  }
  const row = await sessionModel.findUnique({
    where: { userId: user.id },
  });

  if (!row) {
    return res.status(200).json({ data: null });
  }

  const inspect = await execAsync(
    `docker ps --filter name=^/${row.containerName}$ --format "{{.Names}}"`
  ).catch(() => ({ stdout: '' }));
  const isRunning = typeof inspect.stdout === 'string' && inspect.stdout.trim() === row.containerName;

  if (!isRunning) {
    const deleteModel = sessionModel as { deleteMany?: (args: { where: { userId: string } }) => Promise<unknown> };
    if (deleteModel.deleteMany) {
      await deleteModel.deleteMany({ where: { userId: user.id } });
    }
    return res.status(200).json({ data: null });
  }

  return res.status(200).json({
    data: {
      containerName: row.containerName,
      host: row.host,
      port: row.port,
      password: row.password,
    },
  });
}
