import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { revokeClientCertificate } from '@/lib/vpn-pki';

/**
 * Revokes one user's VPN certificate without touching their account.
 *
 * The case this exists for is a leaked or shared .ovpn file: the student is
 * fine, the credential is not. Blocking the account would be the wrong remedy,
 * and there is otherwise no way to invalidate a certificate that is already in
 * someone else's hands.
 *
 * The user simply downloads a new profile afterwards; the old file stops
 * working the moment the server reloads its revocation list.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can revoke VPN access');
    }

    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE');
      return res
        .status(405)
        .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'User ID is required');
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!target) throw new ApiError(404, 'User not found');

    await revokeClientCertificate(id);

    await prisma.eventLog.create({
      data: {
        type: 'vpn_revoked',
        userId: id,
        message: `VPN certificate for ${target.name} revoked by ${currentUser.name}`,
        metadata: { revokedBy: currentUser.id },
      },
    });

    return res.json({ data: { message: 'VPN certificate revoked' } });
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
