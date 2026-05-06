import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { getFileUrl } from '@/lib/storage';
import { ApiError } from '@/lib/errors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(user.role)) throw new ApiError(403, 'Forbidden');

    const assignmentId = req.query.id as string;
    const userId = req.query.userId as string;
    if (!assignmentId || !userId) throw new ApiError(400, 'Missing parameters');

    const submission = await prisma.learnAssignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId, userId } },
      select: { attachmentUrl: true, user: { select: { name: true } } },
    });

    if (!submission?.attachmentUrl) {
      return res.status(404).json({ error: { message: 'No attachment found' } });
    }

    const { attachmentUrl } = submission;

    if (attachmentUrl.startsWith('/api/storage/')) {
      const base = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;
      return res.redirect(302, `${base}${attachmentUrl}${attachmentUrl.includes('?') ? '&' : '?'}download=1`);
    }

    const u = new URL(attachmentUrl);
    const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    const parts = pathname.split('/');
    if (parts.length < 2) throw new ApiError(400, 'Invalid attachment URL');

    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    const filename = key.split('/').pop() || 'attachment';
    const downloadUrl = await getFileUrl(bucket, key, { downloadFilename: filename });

    return res.redirect(302, downloadUrl);
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return res.status(e.status).json({ error: { message: e.message } });
    }
    console.error('[API /admin/learn/assignments/[id]/download]', e);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}
