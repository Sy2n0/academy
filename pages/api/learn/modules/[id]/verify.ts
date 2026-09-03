import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { execInContainer } from '@/lib/docker';
import { findTerminalForUser } from '@/lib/terminal-sessions';
import { z } from 'zod';

const bodySchema = z.object({ exerciseId: z.string().uuid() });

/**
 * Checks one exercise against the learner's own terminal container.
 *
 * The command comes from the exercise record — authored content — and is never
 * built from anything the request carries; the body only names which exercise
 * to run. What it inspects is the container's state, so a student who reached
 * the same result by another route still passes.
 */
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

    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) throw new ApiError(401, 'Unauthorized');

    const { exerciseId } = bodySchema.parse(req.body);
    const { id } = req.query;

    const exercise = await prisma.moduleExercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, moduleId: true, checkCommand: true, hint: true },
    });

    if (!exercise || exercise.moduleId !== id) {
      throw new ApiError(404, 'Exercise not found');
    }

    const containerId = findTerminalForUser(user.id);
    if (!containerId) {
      // Not an error the learner did anything wrong — there is simply nothing
      // to inspect yet, and saying so is more useful than a failed check.
      return res.json({
        data: {
          status: 'no_terminal',
          message: '터미널을 먼저 열어주세요.',
        },
      });
    }

    let passed = false;
    try {
      const result = await execInContainer(containerId, exercise.checkCommand);
      passed = result.exitCode === 0;
    } catch (error: any) {
      // A container that died between launching and checking is a broken
      // session, not a failed exercise.
      return res.json({
        data: {
          status: 'unavailable',
          message: '터미널에 연결하지 못했습니다. 다시 열어주세요.',
        },
      });
    }

    if (passed) {
      // Recorded so progress survives closing the terminal, and idempotent so
      // re-running a passed check does not move the timestamp.
      await prisma.userExerciseCheck.upsert({
        where: { userId_exerciseId: { userId: user.id, exerciseId } },
        create: { userId: user.id, exerciseId },
        update: {},
      });
    }

    return res.json({
      data: {
        status: passed ? 'passed' : 'failed',
        hint: passed ? null : exercise.hint,
      },
    });
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
