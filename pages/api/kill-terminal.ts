import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { removeContainer } from '@/lib/docker';
import { ownsTerminal, releaseTerminal } from '@/lib/terminal-sessions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // The old version shelled out to `docker rm -f <name>` for whatever id it was
  // handed, with no ownership check.
  if (!ownsTerminal(sessionId, session.user.id)) {
    return res.status(403).json({ error: 'Not your terminal session' });
  }

  try {
    await removeContainer(sessionId);
    releaseTerminal(sessionId);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
