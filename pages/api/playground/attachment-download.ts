import type { NextApiRequest, NextApiResponse } from 'next';
import { getFileUrl } from '@/lib/storage';

const BUCKET_BASE = (
  process.env.PLAYGROUND_ATTACHMENT_PUBLIC_BASE_URL ||
  'https://bucket.hub-h4ck.com'
).replace(/\/+$/, '');

const getKeyFromUrl = (value: string): string => {
  try {
    const url = new URL(value);
    if (`${url.protocol}//${url.host}` !== BUCKET_BASE) return '';
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const keyParam =
      typeof req.query.key === 'string'
        ? decodeURIComponent(req.query.key)
        : '';
    const urlParam =
      typeof req.query.url === 'string'
        ? decodeURIComponent(req.query.url)
        : '';

    const key = keyParam || (urlParam ? getKeyFromUrl(urlParam) : '');
    if (!key || key.includes('..')) {
      return res
        .status(400)
        .json({ error: { message: 'Invalid attachment key' } });
    }

    const fileName = key.split('/').pop() || 'attachment';
    const bucket = process.env.S3_BUCKET || 'hub-academy';
    const downloadUrl = await getFileUrl(bucket, key, {
      downloadFilename: fileName,
    });

    return res.redirect(302, downloadUrl);
  } catch (error) {
    console.error('Error creating attachment download URL:', error);
    return res
      .status(500)
      .json({ error: { message: 'Failed to create download URL' } });
  }
}
