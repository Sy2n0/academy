import { getSession } from '@/lib/session';
import { isAdmin } from '@/lib/user-roles';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH');
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const session = await getSession(req, res);
    if (!session) throw new ApiError(401, 'Unauthorized');
    // Fetch user from DB to get role
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !isAdmin(user.role)) {
      throw new ApiError(403, 'Only admins can change user passwords');
    }

    const { id } = req.query;
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: id as string },
      data: { password: hashed },
    });

    res.status(200).json({ data: { success: true } });
  } catch (error: any) {
    res.status(error?.status || 500).json({ error: { message: error?.message || 'Internal Server Error' } });
  }
}
