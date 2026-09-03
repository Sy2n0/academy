import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import {
  createContainer,
  findAvailablePort,
  removeContainer,
} from '@/lib/docker';
import { claimTerminal, releaseTerminal } from '@/lib/terminal-sessions';

/**
 * Web terminal for a learning module.
 *
 * The previous version ran `ubuntu:24.04` with `sleep infinity` and mapped 7681
 * with nothing listening on it, so the session it reported could never be
 * connected to — its own comments said the terminal server was "추후 구현".
 * This launches the configured ttyd image the same way /api/sandbox/instance
 * launches a problem container.
 *
 * LEARN_TERMINAL_IMAGE must be an image that serves a web terminal on
 * LEARN_TERMINAL_CONTAINER_PORT (ttyd's default is 7681).
 */
const IMAGE = process.env.LEARN_TERMINAL_IMAGE || '';
// Port *inside* the container, fixed by the image: the Attack Box image serves
// ttyd on 8080 (22 is its SSH port), a plain ttyd image would be 7681. The host
// side is a free port picked per session below, so concurrent users each get
// their own host port mapped onto this one.
const CONTAINER_PORT = Number(
  process.env.LEARN_TERMINAL_CONTAINER_PORT || 8080
);
const TERMINAL_HOST = process.env.ATTACKBOX_HOST || 'localhost';

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

  if (!IMAGE) {
    return res.status(503).json({
      error:
        'LEARN_TERMINAL_IMAGE is not configured — set it to a ttyd-serving image.',
    });
  }

  let port: number | undefined;
  let containerId: string | undefined;
  try {
    port = await findAvailablePort(20000, 30000);
    ({ containerId } = await createContainer(IMAGE, [
      { host: port, container: CONTAINER_PORT },
    ]));
    claimTerminal(containerId, session.user.id);

    return res.status(201).json({
      sessionId: containerId,
      containerId,
      host: TERMINAL_HOST,
      port,
    });
  } catch (error: any) {
    // Do not leave a container behind if the response could not be built.
    if (containerId) {
      await removeContainer(containerId).catch(() => {});
      releaseTerminal(containerId);
    }
    return res.status(500).json({ error: error.message });
  }
}
