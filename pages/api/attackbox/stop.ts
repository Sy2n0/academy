import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

/**
 * POST: Attack box 컨테이너 중지
 * body.containerName 예: attackbox-kali-22222
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

  const containerName = typeof req.body?.containerName === 'string' ? req.body.containerName.trim() : null;
  if (!containerName || !/^attackbox-[a-z0-9]+-\d+$/.test(containerName)) {
    return res.status(400).json({ error: { message: 'Valid containerName is required' } });
  }

  try {
    await execAsync(`/usr/bin/docker rm -f ${containerName}`);
    await prisma.attackBoxSession.deleteMany({ where: { userId: user.id } });
    console.log('[attackbox/stop]', { userId: user.id, containerName });
    return res.status(200).json({ success: true, containerName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[attackbox/stop]', { userId: user.id, containerName, error: msg });
    return res.status(500).json({ error: { message: 'Docker stop failed', detail: msg } });
  }
}
