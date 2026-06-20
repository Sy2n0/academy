import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

/**
 * POST: Cloud IDE 컨테이너 중지
 * body.containerName 예: cloud-ide-20000
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const requestedContainerName =
    typeof req.body?.containerName === 'string'
      ? req.body.containerName.trim()
      : null;

  const sessionModel = (prisma as any).cloudIDESession as
    | {
        findUnique?: (args: { where: { userId: string } }) => Promise<{
          containerName: string;
        } | null>;
        deleteMany?: (args: {
          where: { userId: string; containerName?: string };
        }) => Promise<unknown>;
      }
    | undefined;

  const existing = sessionModel?.findUnique
    ? await sessionModel.findUnique({ where: { userId: user.id } })
    : null;

  const containerName =
    (requestedContainerName && /^cloud-ide-\d+$/.test(requestedContainerName)
      ? requestedContainerName
      : null) ??
    existing?.containerName ??
    null;

  if (!containerName) {
    if (sessionModel?.deleteMany) {
      await sessionModel.deleteMany({ where: { userId: user.id } });
    }
    return res.status(200).json({
      success: true,
      stopped: false,
      message: 'No active Cloud IDE session',
    });
  }

  try {
    const inspect = await execAsync(
      `docker ps -a --filter name=^/${containerName}$ --format "{{.Names}}"`
    ).catch(() => ({ stdout: '' }));
    const exists =
      typeof inspect.stdout === 'string' &&
      inspect.stdout.trim() === containerName;

    if (exists) {
      await execAsync(`docker stop ${containerName}`).catch(() => undefined);
      await execAsync(`docker rm -f ${containerName}`).catch(() => undefined);
    }

    if (sessionModel?.deleteMany) {
      await sessionModel.deleteMany({ where: { userId: user.id } });
    }

    console.log('[cloud-ide/stop]', { userId: user.id, containerName, exists });
    return res
      .status(200)
      .json({ success: true, containerName, stopped: exists });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cloud-ide/stop]', {
      userId: user.id,
      containerName,
      error: msg,
    });
    return res
      .status(500)
      .json({ error: { message: 'Docker stop failed', detail: msg } });
  }
}
