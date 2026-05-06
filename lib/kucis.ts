import { prisma } from '@/lib/prisma';

export const KUCIS_TEAM_SLUG = 'KUCIS_2026';

export async function isKucisMember(userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: { slug: KUCIS_TEAM_SLUG },
    },
    select: { id: true },
  });
  return membership !== null;
}
