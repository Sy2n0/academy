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

const toBucketPublicUrl = (bucket: string, key: string) => {
  const baseUrl = (process.env.S3_PUBLIC_ENDPOINT || 'https://bucket.hub-h4ck.com').replace(/\/+$/, '');
  return `${baseUrl}/${bucket}/${key}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) return res.status(401).json({ error: { message: 'Unauthorized' } });
    if (!isAdmin(currentUser.role)) return res.status(403).json({ error: { message: 'Forbidden' } });

    const uploadDir = path.join(os.tmpdir(), 'hub-machine-upload');
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

    // machineId or machineName used as folder identifier
    const idField = fields?.machineId;
    const rawId = Array.isArray(idField) ? idField[0] : idField;
    const folderId = typeof rawId === 'string' && rawId.trim()
      ? rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)
      : 'unknown';

    const fileList = files?.file;
    const file = Array.isArray(fileList) ? fileList[0] : fileList;

    if (!file) return res.status(400).json({ error: { message: 'No file uploaded' } });

    const fileSize = (file as { size?: number }).size ?? 0;
    if (fileSize <= 0) return res.status(400).json({ error: { message: 'Empty file' } });

    const filepath = (file as { filepath?: string }).filepath;
    if (!filepath) return res.status(400).json({ error: { message: 'File data not available' } });

    const originalFilename = (file as { originalFilename?: string }).originalFilename ?? 'file';
    const mimetype = (file as { mimetype?: string }).mimetype ?? 'application/octet-stream';

    const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
    const key = `machines/active/${folderId}/${Date.now()}-${safeName}`;
    const bucket = process.env.S3_BUCKET || 'hub-academy';

    const buffer = await fs.readFile(filepath);
    await uploadFile(bucket, key, buffer, mimetype);

    const isLocalStorage = !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY;
    const url = isLocalStorage ? `/api/storage/${key}?download=1` : toBucketPublicUrl(bucket, key);

    return res.status(200).json({
      data: { name: safeName, size: fileSize, type: mimetype, key, url },
    });
  } catch (error) {
    console.error('Error uploading machine file:', error);
    return res.status(500).json({ error: { message: 'Upload failed' } });
  }
}
