import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { uploadFile } from '@/lib/storage';

export const config = {
  api: { bodyParser: false },
};

const normalizeCodeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

const toBucketPublicUrl = (key: string) => {
  const baseUrl = (
    process.env.PLAYGROUND_ATTACHMENT_PUBLIC_BASE_URL ||
    'https://bucket.hub-h4ck.com'
  ).replace(/\/+$/, '');
  return `${baseUrl}/${key}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    if (!isAdmin(currentUser.role)) {
      return res
        .status(403)
        .json({ error: { message: 'Only admins can upload challenge files' } });
    }

    const uploadDir = path.join(os.tmpdir(), 'hub-playground-upload');
    await fs.mkdir(uploadDir, { recursive: true });

    const { IncomingForm } = await import('formidable');
    const form = new IncomingForm({
      maxFileSize: 500 * 1024 * 1024,
      maxTotalFileSize: 500 * 1024 * 1024,
      uploadDir,
      keepExtensions: true,
      allowEmptyFiles: false,
      minFileSize: 1,
      multiples: false,
    });

    const [fields, files] = await form.parse(req as any);
    const codeNameField = fields?.codeName;
    const rawCodeName = Array.isArray(codeNameField)
      ? codeNameField[0]
      : codeNameField;
    const codeName = typeof rawCodeName === 'string' ? rawCodeName : '';

    if (!codeName.trim()) {
      return res
        .status(400)
        .json({ error: { message: 'codeName is required' } });
    }

    const fileList = files?.file ?? files?.attachment ?? files?.attachmentUrl;
    const file = Array.isArray(fileList) ? fileList[0] : fileList;

    if (!file || typeof file === 'undefined') {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }

    const fileSize = (file as { size?: number }).size ?? 0;
    if (fileSize <= 0) {
      return res
        .status(400)
        .json({ error: { message: 'Empty file is not allowed' } });
    }

    const filepath = (file as { filepath?: string }).filepath;
    if (!filepath || typeof filepath !== 'string') {
      return res
        .status(400)
        .json({ error: { message: 'File data not available' } });
    }

    const originalFilename =
      (file as { originalFilename?: string }).originalFilename ?? 'file';
    const mimetype =
      (file as { mimetype?: string }).mimetype ?? 'application/octet-stream';

    const safeName =
      originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
    const normalizedCodeName = normalizeCodeName(codeName);
    const key = `playground/challenges/${normalizedCodeName}/${Date.now()}-${safeName}`;
    const bucket = process.env.S3_BUCKET || 'hub-academy';

    const buffer = await fs.readFile(filepath);
    await uploadFile(bucket, key, buffer, mimetype);

    const isLocalStorage =
      !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY;
    const url = isLocalStorage
      ? `/api/storage/${key}?download=1`
      : toBucketPublicUrl(key);

    return res.status(200).json({
      data: {
        name: safeName,
        size: fileSize,
        type: mimetype,
        key,
        url,
      },
    });
  } catch (error) {
    console.error('Error uploading playground challenge attachment:', error);
    return res.status(500).json({ error: { message: 'Upload failed' } });
  }
}
