import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인 (선택사항 - 필요에 따라 제거 가능)
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // 허용된 프로토콜만 (보안)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res
        .status(400)
        .json({ error: 'Only HTTP and HTTPS URLs are allowed' });
    }

    // 요청 보내기
    const fetchResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HUB-ACADEMY/1.0)',
        Accept: '*/*',
      },
      // 타임아웃 설정 (10초)
      signal: AbortSignal.timeout(10000),
    });

    // Response 헤더 추출
    const responseHeaders: Record<string, string> = {};
    fetchResponse.headers.forEach((value, key) => {
      // 일부 헤더는 제외 (보안상 민감한 정보)
      if (!['set-cookie', 'x-powered-by'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    // Response Body 추출
    let body = '';
    const contentType = fetchResponse.headers.get('content-type') || '';

    if (
      contentType.includes('text/') ||
      contentType.includes('application/json') ||
      contentType.includes('application/xml')
    ) {
      try {
        body = await fetchResponse.text();
        // 너무 긴 응답은 잘라내기
        if (body.length > 10000) {
          body = body.substring(0, 10000) + '\n\n...(truncated)';
        }
      } catch (e) {
        body = '(Failed to read response body)';
      }
    } else {
      body = `(Binary content: ${contentType})`;
    }

    res.status(200).json({
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      responseHeaders,
      body,
      url: fetchResponse.url, // 리다이렉트된 URL
    });
  } catch (error: any) {
    console.error('[API /proxy-fetch] Error:', error);

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return res.status(408).json({ error: 'Request timeout' });
    }

    res.status(500).json({
      error: error.message || 'Failed to fetch URL',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
