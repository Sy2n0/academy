import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { isKucisMember } from '@/lib/kucis';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const STATUSES = [
  'OPEN',
  'TRIAGED',
  'IN_REVIEW',
  'ACCEPTED',
  'CLOSED',
] as const;
const TARGETS = ['cFS', 'CF', 'CryptoLib', 'SBN'] as const;

const updateReportSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  team: z.string().min(1).max(120).optional(),
  target: z.enum(TARGETS).optional(),
  reportedTo: z.string().max(300).nullable().optional(),
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(STATUSES).optional(),
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

    const id = req.query.id;
    if (typeof id !== 'string') {
      throw new ApiError(400, 'Invalid report id');
    }

    if (!isAdmin(currentUser.role) && !(await isKucisMember(currentUser.id))) {
      throw new ApiError(403, 'Only KUCIS team members can modify reports');
    }

    switch (req.method) {
      case 'PATCH':
        await handlePATCH(req, res, id);
        break;
      case 'DELETE':
        await handleDELETE(res, id);
        break;
      default:
        res.setHeader('Allow', 'PATCH, DELETE');
        res
          .status(405)
          .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

const handlePATCH = async (
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) => {
  const parsed = updateReportSchema.parse(req.body);
  const data: typeof parsed = { ...parsed };
  if (typeof parsed.reportedTo === 'string') {
    const trimmed = parsed.reportedTo.trim();
    data.reportedTo = trimmed.length > 0 ? trimmed : null;
  }

  const report = await prisma.kucisVulnerabilityReport.update({
    where: { id },
    data,
  });

  res.json({ data: { report } });
};

const handleDELETE = async (res: NextApiResponse, id: string) => {
  await prisma.kucisVulnerabilityReport.delete({ where: { id } });
  res.status(204).end();
};
