import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { uploadAssignmentSubmissionFile } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const assignmentId = req.query.id as string;
  if (!assignmentId) {
    return res.status(400).json({ error: { message: 'Assignment ID required' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const assignment = await (prisma as any).learnAssignment?.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || !assignment.isActive) {
      return res.status(404).json({ error: { message: 'Assignment not found' } });
    }

    const [enrolledTrackIds, completedModuleIds] = await Promise.all([
      prisma.userSkillPathEnrollment.findMany({ where: { userId: user.id }, select: { skillPathId: true } }).then((r) => r.map((x) => x.skillPathId)),
      prisma.userModuleCompletion.findMany({ where: { userId: user.id }, select: { moduleId: true } }).then((r) => r.map((x) => x.moduleId)),
    ]);
    const eligible =
      assignment.targetType === 'ALL' ||
      (assignment.targetType === 'TRACK' && assignment.targetId && enrolledTrackIds.includes(assignment.targetId)) ||
      (assignment.targetType === 'MODULE' && assignment.targetId && completedModuleIds.includes(assignment.targetId));
    if (!eligible) {
      return res.status(403).json({ error: { message: 'Not eligible to submit this assignment' } });
    }

    const uploadDir = path.join(os.tmpdir(), 'hub-academy-upload');
    await fs.mkdir(uploadDir, { recursive: true });

    const { IncomingForm } = await import('formidable');
    const form = new IncomingForm({
      maxFileSize: 500 * 1024 * 1024,   // 500MB
      maxTotalFileSize: 500 * 1024 * 1024,
      uploadDir,
      keepExtensions: true,
      allowEmptyFiles: true,
      minFileSize: 0,
    });

    const [fields, files] = await form.parse(req as any);
    const fileList = files?.file ?? files?.attachment ?? files?.attachmentUrl;
    const file = Array.isArray(fileList) ? fileList[0] : fileList;
    if (!file || typeof file === 'undefined') {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }

    const fileSize = (file as { size?: number }).size ?? 0;
    if (fileSize <= 0) {
      return res.status(400).json({ error: { message: 'Empty file is not allowed' } });
    }

    const filepath = (file as { filepath?: string }).filepath;
    if (!filepath || typeof filepath !== 'string') {
      return res.status(400).json({ error: { message: 'File data not available' } });
    }

    const originalFilename = (file as { originalFilename?: string }).originalFilename ?? 'file';
    const mimetype = (file as { mimetype?: string }).mimetype;
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filepath);
    } catch (readErr) {
      console.error('[upload] readFile failed', readErr);
      return res.status(500).json({ error: { message: 'Failed to read uploaded file' } });
    }

    let url: string;
    try {
      url = await uploadAssignmentSubmissionFile(
        assignmentId,
        user.id,
        buffer,
        originalFilename,
        mimetype
      );
    } catch (uploadErr: any) {
      console.error('[upload] storage upload failed', uploadErr);
      return res.status(500).json({
        error: { message: uploadErr?.message ?? 'Storage upload failed' },
      });
    }
    return res.status(200).json({ data: { url } });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const stack = e?.stack;
    console.error('[API /learn/assignments/[id]/upload]', e);
    return res.status(500).json({
      error: {
        message: process.env.NODE_ENV === 'development' ? msg : 'Upload failed',
        ...(process.env.NODE_ENV === 'development' && stack && { detail: stack }),
      },
    });
  }
}
