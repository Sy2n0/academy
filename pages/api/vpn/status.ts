import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { ApiError } from '@/lib/errors';
import { getVpnState, isVpnRequired } from '@/lib/vpn';
import { isVpnServerReady } from '@/lib/vpn-pki';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res
        .status(405)
        .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) throw new ApiError(401, 'Unauthorized');

    const [state, serverReady] = await Promise.all([
      getVpnState(user.id),
      isVpnServerReady(),
    ]);

    return res.json({
      data: { ...state, required: isVpnRequired(), serverReady },
    });
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
