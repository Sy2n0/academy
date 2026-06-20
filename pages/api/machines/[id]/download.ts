import type { NextApiRequest, NextApiResponse } from 'next';
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
    if (!machine.attachmentUrl)
      return res.status(404).json({ error: { message: '파일이 없습니다' } });

    // URL에서 bucket/key 추출
    // 형식: https://bucket.hub-h4ck.com/{bucket}/{key}
    const url = new URL(machine.attachmentUrl);
    const parts = url.pathname.replace(/^\//, '').split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    const filename = key.split('/').pop() || 'download';

    console.log('[download] bucket:', bucket, 'key:', key);
    const buffer = await downloadFile(bucket, key);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error: any) {
    console.error(
      '[download] error:',
      JSON.stringify(error, null, 2),
      error?.message,
      error?.Code,
      error?.name
    );
    return res.status(500).json({
      error: {
        message:
          error?.message ||
          error?.Code ||
          String(error) ||
          '파일 다운로드 실패',
        code: error?.Code || error?.name,
      },
    });
  }
}
