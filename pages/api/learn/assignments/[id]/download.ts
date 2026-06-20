import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { getFileUrl } from '@/lib/storage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const assignmentId = req.query.id as string;
  if (!assignmentId) {
    return res
      .status(400)
      .json({ error: { message: 'Missing assignment id' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const submission = await prisma.learnAssignmentSubmission.findFirst({
    where: { assignmentId, userId: user.id },
    select: { attachmentUrl: true },
  });

  const attachmentUrl = submission?.attachmentUrl;
  if (!attachmentUrl || typeof attachmentUrl !== 'string') {
    return res.status(404).json({ error: { message: 'No attachment found' } });
  }

  if (attachmentUrl.startsWith('/api/storage/')) {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://${req.headers.host || 'localhost'}`;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const sep = attachmentUrl.includes('?') ? '&' : '?';
    const redirectUrl = `${base}${basePath}${attachmentUrl}${sep}download=1`;
    res.redirect(302, redirectUrl);
    return;
  }

  try {
    const u = new URL(attachmentUrl);
    const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    const parts = pathname.split('/');
    if (parts.length < 2) {
      return res
        .status(400)
        .json({ error: { message: 'Invalid attachment URL' } });
    }
    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    const filename = key.split('/').pop() || 'attachment';
    const downloadUrl = await getFileUrl(bucket, key, {
      downloadFilename: filename,
    });
    res.redirect(302, downloadUrl);
  } catch (e) {
    console.error('[API learn/assignments download]', e);
    return res
      .status(500)
      .json({ error: { message: 'Failed to generate download URL' } });
  }
}
