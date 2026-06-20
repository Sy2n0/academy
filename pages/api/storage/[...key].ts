import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const keyArr = req.query.key;
  const key = Array.isArray(keyArr) ? keyArr.join('/') : String(keyArr ?? '');
  if (!key || key.includes('..')) {
    return res.status(400).json({ error: { message: 'Invalid key' } });
  }

  const storageDir = process.env.LOCAL_STORAGE_DIR || './storage';
  const filePath = path.join(storageDir, key);
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: { message: 'Not found' } });
    }
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(key).toLowerCase();
    const types: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    const contentType = types[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const filename = path.basename(key);
    const forceDownload =
      req.query.download === '1' || req.query.download === 'true';
    res.setHeader(
      'Content-Disposition',
      forceDownload
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`
    );
    return res.send(buffer);
  } catch {
    return res.status(404).json({ error: { message: 'Not found' } });
  }
}
