import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

// CI/CD calls this endpoint to store test results without a session.
// Protected by a shared API key set in PLATFORM_API_KEY env var.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res
        .status(405)
        .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.PLATFORM_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      throw new ApiError(401, 'Invalid API key');
    }

    const {
      trigger,
      commit,
      branch,
      status,
      passedCount,
      failedCount,
      skipCount,
      duration,
      results,
    } = req.body ?? {};

    const validStatuses = ['PENDING', 'RUNNING', 'PASSED', 'FAILED', 'ERROR'];
    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `status must be one of: ${validStatuses.join(', ')}`
      );
    }

    const run = await prisma.testRun.create({
      data: {
        status,
        trigger: trigger ?? 'ci',
        commit: commit ?? null,
        branch: branch ?? null,
        passedCount: typeof passedCount === 'number' ? passedCount : 0,
        failedCount: typeof failedCount === 'number' ? failedCount : 0,
        skipCount: typeof skipCount === 'number' ? skipCount : 0,
        duration: typeof duration === 'number' ? duration : null,
        results: results ?? null,
      },
    });

    res.status(201).json({ data: { id: run.id } });
  } catch (error: any) {
    res
      .status(error.status ?? 500)
      .json({ error: { message: error.message ?? 'Something went wrong' } });
  }
}
