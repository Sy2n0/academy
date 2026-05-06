import type { NextPageWithLayout } from 'types';
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { type ReactElement } from 'react';
import Head from 'next/head';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';
import { ensureBadgeInfrastructure } from '@/lib/badges';

type BadgesProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const BadgesPage: NextPageWithLayout<BadgesProps> = ({ user, earnedBadges }) => {
  const roleBadgeVariant = user.role === UserRole.ADMIN || user.role === 'ADMIN' ? 'destructive' : 'secondary';

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Badges
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    BADGES
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    ACADEMY에서 학습 및 CTF를 진행하며 Badge를 획득하세요!
                  </p>
                </div>

                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    MY BADGES
                  </h3>
                  {earnedBadges.length === 0 ? (
                    <p className="font-mono text-sm text-muted-foreground">
                      아직 획득한 배지가 없습니다.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {earnedBadges.map((badge) => (
                        <div key={badge.codeName} className="rounded-lg border border-border/30 bg-background/60 p-3">
                          <div className="aspect-square w-full rounded-md overflow-hidden border border-border/30 bg-muted/20 mb-2 flex items-center justify-center">
                            {badge.image ? (
                              <img src={badge.image} alt={badge.badgeName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">NO BADGE IMAGE</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{badge.codeName}</Badge>
                            <p className="font-mono text-xs text-foreground truncate">{badge.badgeName}</p>
                            <p className="font-mono text-[10px] text-muted-foreground truncate">{badge.ctfName}</p>
                            {badge.description && (
                              <p className="font-mono text-[10px] text-foreground/80 leading-4 line-clamp-2">{badge.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={roleBadgeVariant}>{user.role || UserRole.USER}</Badge>
                    <p className="font-mono text-xs text-muted-foreground">Account role badge</p>
                  </div>
                </div> */}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);
  const { locale } = context;

  if (!user) {
    return {
      notFound: true,
    };
  }

  await ensureBadgeInfrastructure();

  const manualBadges = await prisma.$queryRaw<Array<{
    badgeId: string;
    codeName: string;
    badgeName: string;
    image: string | null;
    ctfName: string;
    description: string | null;
  }>>`
    SELECT
      bc."id" AS "badgeId",
      bc."slug" AS "codeName",
      bc."name" AS "badgeName",
      bc."imageUrl" AS "image",
      'Manual Assignment' AS "ctfName",
      bc."description" AS "description"
    FROM "UserBadgeAssignment" uba
    JOIN "BadgeCatalog" bc ON bc."id" = uba."badgeId"
    WHERE uba."userId" = ${user.id}
      AND bc."isActive" = true
  `;

  const playgroundBadges = await prisma.$queryRaw<Array<{
    badgeId: string;
    codeName: string;
    badgeName: string;
    image: string | null;
    ctfName: string;
    description: string | null;
  }>>`
    SELECT
      bc."id" AS "badgeId",
      ps."codeName" AS "codeName",
      bc."name" AS "badgeName",
      bc."imageUrl" AS "image",
      ps."name" AS "ctfName",
      bc."description" AS "description"
    FROM "PlaygroundEnrollment" pe
    JOIN "PlaygroundSettings" ps ON ps."id" = pe."playgroundId"
    JOIN "PlaygroundBadgeMapping" pbm
      ON LOWER(pbm."playgroundCodeName") = LOWER(ps."codeName")
    JOIN "BadgeCatalog" bc ON bc."id" = pbm."badgeId"
    WHERE pe."userId" = ${user.id}
      AND bc."isActive" = true
  `;

  const merged = [...manualBadges, ...playgroundBadges];
  const dedupMap = new Map<string, (typeof merged)[number]>();
  for (const item of merged) {
    const key = `${item.badgeId}:${item.codeName.toLowerCase()}`;
    if (!dedupMap.has(key)) dedupMap.set(key, item);
  }

  const earnedBadges = Array.from(dedupMap.values()).map((item) => ({
    codeName: item.codeName,
    badgeName: item.badgeName,
    image: item.image || '',
    ctfName: item.ctfName,
    description: item.description || '',
  }));

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      user: {
        id: user.id,
        role: user.role || 'USER',
      },
      earnedBadges,
    },
  };
};

BadgesPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default BadgesPage;
