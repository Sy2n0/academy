import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { tryRevokeClientCertificate } from '@/lib/vpn-pki';

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
      throw new ApiError(403, 'Only admins can delete users');
    }

    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'User ID is required');
    }

    // An admin who deletes their own account loses the session mid-request and
    // cannot undo it, so this is refused rather than handled.
    if (id === currentUser.id) {
      throw new ApiError(400, '자기 자신은 삭제할 수 없습니다');
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!target) {
      throw new ApiError(404, 'User not found');
    }

    // Every relation that carries a userId cascades, so the delete also takes
    // the account's score history, solves and submissions with it — which moves
    // everyone else's ranking. Deactivating is the reversible option; this one
    // is not.
    // Revoked before the row goes, since the profile that names the
    // certificate cascades away with it — after the delete there is nothing
    // left to say which certificate belonged to this account.
    await tryRevokeClientCertificate(id);

    await prisma.user.delete({ where: { id } });

    // Written with a null userId on purpose: EventLog.userId cascades too, so a
    // row pointing at the deleted account would be removed along with it.
    await prisma.eventLog.create({
      data: {
        type: 'user_deleted',
        message: `User ${target.name} (${target.email}) deleted by ${currentUser.name}`,
        metadata: {
          deletedUserId: target.id,
          deletedUserEmail: target.email,
          deletedUserRole: target.role,
          deletedBy: currentUser.id,
        },
      },
    });

    res.json({ data: { message: 'User deleted successfully' } });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
