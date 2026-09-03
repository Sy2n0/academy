import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { ApiError } from '@/lib/errors';
import { ensureClientCertificate, buildClientConfig } from '@/lib/vpn-pki';

/**
 * Serves the signed-in user their own .ovpn bundle.
 *
 * The file contains a private key, so it is issued per user, never cached, and
 * never addressable by anyone else — there is deliberately no id parameter.
 */
/**
 * Names the download after the account it belongs to.
 *
 * Every student's file was called hub-academy.ovpn, so a second download landed
 * as hub-academy (1).ovpn and two people comparing files had no way to tell
 * whose was whose. The local part of the address identifies it; the domain is
 * the same for everyone here and only adds length.
 *
 * Anything outside the safe set is dropped rather than escaped — this string
 * goes into a Content-Disposition header, where a quote or a newline would end
 * the field early.
 */
export function vpnFileName(email?: string | null): string {
  const local = (email ?? '').split('@')[0].toLowerCase();
  const safe = local.replace(/[^a-z0-9._-]/g, '').slice(0, 40);

  return `${safe || 'client'}-hub-academy.ovpn`;
}

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

    const commonName = await ensureClientCertificate(user.id);
    const config = await buildClientConfig(commonName);

    res.setHeader('Content-Type', 'application/x-openvpn-profile');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${vpnFileName(user.email)}"`
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.send(config);
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
