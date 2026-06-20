import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { isKucisMember } from '@/lib/kucis';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const TARGETS = ['cFS', 'CF', 'CryptoLib', 'SBN'] as const;

const createReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  team: z.string().min(1, 'Team is required').max(120),
  target: z.enum(TARGETS),
  reportedTo: z.string().max(300).optional(),
  severity: z.enum(SEVERITIES),
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

    switch (req.method) {
      case 'GET':
        await handleGET(res);
        break;
      case 'POST':
        if (
          !isAdmin(currentUser.role) &&
          !(await isKucisMember(currentUser.id))
        ) {
          throw new ApiError(403, 'Only KUCIS team members can submit reports');
        }
        await handlePOST(req, res, currentUser.id);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
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

const handleGET = async (res: NextApiResponse) => {
  const reports = await prisma.kucisVulnerabilityReport.findMany({
    orderBy: { submittedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.json({ data: { reports } });
};

const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { title, team, target, reportedTo, severity } =
    createReportSchema.parse(req.body);

  const report = await prisma.kucisVulnerabilityReport.create({
    data: {
      userId,
      title,
      team,
      target,
      reportedTo: reportedTo?.trim() ? reportedTo.trim() : null,
      severity,
      status: 'OPEN',
    },
  });

  res.status(201).json({ data: { report } });
};
