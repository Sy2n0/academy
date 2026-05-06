import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    // 세션에서 사용자 정보 가져오기
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    const userId = user?.id;
    
    console.log('[API /machines] userId:', userId, 'user email:', user?.email);

    const machines = await prisma.machine.findMany({
      where: {
        isActive: true,
        categoryType: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 사용자 통계 계산 (점수와 풀은 machine 수)
    let userTotalScore = 0;
    let userSolvedCount = 0;

    if (userId) {
      // 사용자의 총 점수
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true },
      });
      userTotalScore = userData?.totalPoints || 0;

      // 사용자가 풀은 machine 수 (팀 제출 포함)
      const solvedMachines = await prisma.flagSubmission.findMany({
        where: {
          userId,
          isCorrect: true,
        },
        select: {
          machineId: true,
        },
        distinct: ['machineId'],
      });
      userSolvedCount = solvedMachines.length;
    }

    // solvedCount 계산 (고유한 사용자/팀 수)
    console.log('[API] Starting machinesWithCounts calculation, machines count:', machines.length);
    const machinesWithCounts = await Promise.all(
      machines.map(async (machine) => {
        try {
          // 정답을 맞춘 모든 제출 가져오기
          const correctSubmissions = await prisma.flagSubmission.findMany({
            where: {
              machineId: machine.id,
              isCorrect: true,
            },
            select: {
              userId: true,
              teamId: true,
            },
          });

          // userId와 teamId 조합으로 고유한 해결자 수 계산
          const uniqueSolvers = new Set<string>();
          correctSubmissions.forEach(sub => {
            // 팀이 있으면 팀 기준, 없으면 사용자 기준
            if (sub.teamId) {
              uniqueSolvers.add(`team-${sub.teamId}`);
            } else if (sub.userId) {
              uniqueSolvers.add(`user-${sub.userId}`);
            }
          });

          const solvedCount = uniqueSolvers.size;

          // 사용자가 이 machine을 풀었는지 확인
          let isSolved = false;
          if (userId) {
            const userSolved = await prisma.flagSubmission.findFirst({
              where: {
                machineId: machine.id,
                userId,
                isCorrect: true,
              },
            });
            isSolved = !!userSolved;
          }

          const machineData = {
            id: machine.id,
            name: machine.title || '',
            difficulty: machine.category || '',
            type: machine.type || null,
            points: machine.score || 0,
            solvedCount: solvedCount || 0,
            isActive: machine.isActive ?? true,
            isSolved: Boolean(isSolved), // 명시적으로 boolean으로 변환
          };
          
          return machineData;
        } catch (err: any) {
          console.error(`[API] Error processing machine ${machine.id}:`, err);
          // 에러가 발생해도 기본값으로 반환
          return {
            id: machine.id,
            name: machine.title || '',
            difficulty: machine.category || '',
            type: machine.type || null,
            points: machine.score || 0,
            solvedCount: 0,
            isActive: machine.isActive ?? true,
            isSolved: false,
          };
        }
      })
    );
    console.log('[API] machinesWithCounts calculated, count:', machinesWithCounts.length);

    // 디버깅: 첫 번째 machine의 isSolved 확인
    if (machinesWithCounts.length > 0) {
      console.log('[API Response] First machine:', JSON.stringify({
        name: machinesWithCounts[0].name,
        isSolved: machinesWithCounts[0].isSolved,
        type: typeof machinesWithCounts[0].isSolved,
        fullObject: machinesWithCounts[0],
      }, null, 2));
    }
    
    // 명시적으로 isSolved를 포함한 응답 생성
    try {
      const machinesResponse = machinesWithCounts.map(m => {
        try {
          return {
            id: m.id || '',
            name: m.name || '',
            difficulty: m.difficulty || '',
            type: m.type || null,
            points: m.points || 0,
            solvedCount: m.solvedCount || 0,
            isActive: m.isActive ?? true,
            isSolved: m.isSolved !== undefined ? Boolean(m.isSolved) : false, // 명시적으로 boolean 보장
          };
        } catch (err) {
          console.error('[API] Error mapping machine:', m, err);
          return null;
        }
      }).filter(m => m !== null);
      
      const response = {
        data: {
          machines: machinesResponse,
          userStats: {
            totalScore: userTotalScore,
            solvedCount: userSolvedCount,
          },
        },
      };
      
      console.log('[API Response] Full response machines count:', machinesResponse.length);
      
      res.status(200).json(response);
    } catch (mapError: any) {
      console.error('[API] Error in response mapping:', mapError);
      throw mapError;
    }
  } catch (error: any) {
    console.error('[API /machines] Error:', error);
    console.error('[API /machines] Error stack:', error.stack);
    const message = error.message || 'Something went wrong';
    res.status(500).json({ error: { message, details: error.toString() } });
  }
}
