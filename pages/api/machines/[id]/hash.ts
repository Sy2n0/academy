import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } });

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: { message: 'Invalid machine ID' } });
    }

    const machine = await prisma.machine.findUnique({
      where: { id },
      select: { attachmentUrl: true, title: true },
    });

    if (!machine) return res.status(404).json({ error: { message: 'Machine not found' } });
    if (!machine.attachmentUrl) {
      return res.status(404).json({ error: { message: '파일이 없습니다' } });
    }

    const fileRes = await fetch(machine.attachmentUrl);
    if (!fileRes.ok) {
      return res.status(502).json({ error: { message: '파일을 가져오지 못했습니다' } });
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    return res.status(200).json({ data: { sha256, size: buffer.length } });
  } catch (error) {
    console.error('Error computing file hash:', error);
    return res.status(500).json({ error: { message: 'Hash 계산에 실패했습니다' } });
  }
}
