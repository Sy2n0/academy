import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/storage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user)
      return res.status(401).json({ error: { message: 'Unauthorized' } });

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: { message: 'Invalid machine ID' } });
    }

    const machine = await prisma.machine.findUnique({
      where: { id },
      select: { attachmentUrl: true, title: true },
    });

    if (!machine)
      return res.status(404).json({ error: { message: 'Machine not found' } });
    if (!machine.attachmentUrl) {
      return res.status(404).json({ error: { message: '파일이 없습니다' } });
    }

    // Fetch through the S3 client, as /download does. A plain fetch of
    // attachmentUrl only works if the object is public — it is not, so this
    // endpoint returned 502 for every machine that had a file.
    const url = new URL(machine.attachmentUrl);
    const parts = url.pathname.replace(/^\//, '').split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    const buffer = await downloadFile(bucket, key);
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    return res.status(200).json({
      data: {
        sha256,
        size: buffer.length,
        filename: key.split('/').pop() || 'attachment',
      },
    });
  } catch (error) {
    console.error('Error computing file hash:', error);
    return res
      .status(500)
      .json({ error: { message: 'Hash 계산에 실패했습니다' } });
  }
}
