import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: { message: 'Track ID is required' } });
    }

    // Track이 존재하는지 확인
    const track = await prisma.skillPath.findUnique({
      where: { 
        id,
        isActive: true,
      },
    });

    if (!track) {
      return res.status(404).json({ error: { message: 'Track not found' } });
    }

    if (req.method === 'POST') {
      // 등록
      const existingEnrollment = await prisma.userSkillPathEnrollment.findUnique({
        where: {
          userId_skillPathId: {
            userId: user.id,
            skillPathId: id,
          },
        },
      });

      if (existingEnrollment) {
        return res.status(200).json({ 
          data: { message: 'Already enrolled', enrolled: true } 
        });
      }

      await prisma.userSkillPathEnrollment.create({
        data: {
          userId: user.id,
          skillPathId: id,
        },
      });

      return res.status(200).json({ 
        data: { message: 'Successfully enrolled', enrolled: true } 
      });
    } else if (req.method === 'DELETE') {
      // 해제
      const enrollment = await prisma.userSkillPathEnrollment.findUnique({
        where: {
          userId_skillPathId: {
            userId: user.id,
            skillPathId: id,
          },
        },
      });

      if (!enrollment) {
        return res.status(200).json({ 
          data: { message: 'Not enrolled', enrolled: false } 
        });
      }

      await prisma.userSkillPathEnrollment.delete({
        where: {
          userId_skillPathId: {
            userId: user.id,
            skillPathId: id,
          },
        },
      });

      return res.status(200).json({ 
        data: { message: 'Successfully unenrolled', enrolled: false } 
      });
    } else {
      return res.status(405).json({ error: { message: 'Method not allowed' } });
    }
  } catch (error: any) {
    console.error('[API /learn/tracks/[id]/enroll] Error:', error);
    return res.status(500).json({ 
      error: { message: error.message || 'Internal server error' }
    });
  }
}
