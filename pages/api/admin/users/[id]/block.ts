import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { tryRevokeClientCertificate } from '@/lib/vpn-pki';
import { z } from 'zod';

const blockSchema = z.object({
  isBlocked: z.boolean(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can block users');
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'User ID is required');
    }

    const { isBlocked } = blockSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked },
    });

    // The tunnel authenticates a certificate, not a session, so blocking the
    // account leaves the VPN untouched — a blocked user stays on the machine
    // network until the certificate itself is revoked. Re-enabling does not
    // reissue automatically: the user downloads a fresh profile.
    if (isBlocked) {
      await tryRevokeClientCertificate(id);
    }

    // EventLog 기록
    await prisma.eventLog.create({
      data: {
        type: 'user_blocked',
        userId: id,
        message: `User ${user.name} ${isBlocked ? 'blocked' : 'unblocked'}`,
        metadata: {
          isBlocked,
        },
      },
    });

    res.json({
      data: {
        message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isBlocked: user.isBlocked,
        },
      },
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
