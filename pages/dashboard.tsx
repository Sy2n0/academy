import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
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
import { AnimatedNoise } from '@/components/animated-noise';
import { getSession } from '@/lib/session';
import { getUserBySession, updateUser } from 'models/user';
import { getUserScoreStats, getUserRanking, getUserScoreHistory } from 'models/score';
import { calculateRank, getRankInfo, getRankProgress, getPointsToNextRank } from '@/lib/ranks';
import Head from 'next/head';

type DashboardProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const numberFormatter = new Intl.NumberFormat('en-US');

function ClientDate({ dateStr }: { dateStr: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <span className="font-mono text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}
    </span>
  );
}

const Dashboard: NextPageWithLayout<DashboardProps> = ({
  stats,
  rankInfo,
  ranking,
  recentActivity,
}) => {
  const { t } = useTranslation('common');
  const progressBarColorClass =
    rankInfo.progress >= 100
      ? 'bg-green-500'
      : rankInfo.progress >= 75
      ? 'bg-lime-500'
      : rankInfo.progress >= 50
      ? 'bg-yellow-500'
      : rankInfo.progress >= 25
      ? 'bg-orange-500'
      : 'bg-red-500';

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
                          Dashboard
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    DASHBOARD
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Welcome to HUB ACADEMY Dashboard
                  </p>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-3">
                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      STATS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Total Points
                        </p>
                        <p className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground">
                          {numberFormatter.format(stats.totalPoints)}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Rank
                        </p>
                        <p className="font-mono text-lg text-foreground">
                          {rankInfo.name}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Level {rankInfo.level} ({rankInfo.hex})
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Ranking
                        </p>
                        <p className="font-mono text-lg text-foreground">
                          #{ranking}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      ACTIVITY
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Machines Solved
                        </p>
                        <p className="font-mono text-2xl text-foreground">
                          {stats.byType.MACHINE?.count || 0}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {stats.byType.MACHINE?.earned || 0} pts
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Tracks Completed
                        </p>
                        <p className="font-mono text-2xl text-foreground">
                          {stats.byType.TRACK?.count || 0}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {stats.byType.TRACK?.earned || 0} pts
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Total Activities
                        </p>
                        <p className="font-mono text-2xl text-foreground">
                          {stats.total.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      PROGRESS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            Next Rank
                          </p>
                          <p className="font-mono text-xs text-foreground">
                            {rankInfo.progress.toFixed(1)}%
                          </p>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${progressBarColorClass}`}
                            style={{ width: `${rankInfo.progress}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Points to Next Rank
                        </p>
                        <p className="font-mono text-lg text-foreground">
                          {numberFormatter.format(rankInfo.pointsToNext)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                    RECENT ACTIVITY
                  </h3>
                  {recentActivity.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 no-scrollbar">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                        >
                          <div className="flex-1">
                            <p className="font-mono text-sm text-foreground">
                              {activity.description || `${activity.type} completed`}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              <ClientDate dateStr={activity.createdAt} />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm">
                              <span className="text-green-500">+{activity.earnedPoints}</span>{' '}
                              <span className="text-white">pts</span>
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {activity.type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-sm text-muted-foreground">
                      No activity yet. Start solving challenges to earn points!
                    </p>
                  )}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const [stats, ranking, recentActivity] = await Promise.all([
    getUserScoreStats(user.id),
    getUserRanking(user.id),
    getUserScoreHistory(user.id, undefined, 10),
  ]);

  const calculatedRank = calculateRank(user.totalPoints);

  if (calculatedRank !== user.currentRank) {
    await updateUser({
      where: { id: user.id },
      data: { currentRank: calculatedRank },
    });
  }

  const rankInfo = getRankInfo(calculatedRank);
  const progress = getRankProgress(user.totalPoints, calculatedRank);
  const pointsToNext = getPointsToNextRank(user.totalPoints, calculatedRank);

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      stats: {
        totalPoints: user.totalPoints,
        total: stats.total,
        byType: stats.byType,
      },
      rankInfo: {
        ...rankInfo,
        progress,
        pointsToNext,
      },
      ranking,
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        type: activity.type,
        earnedPoints: activity.earnedPoints,
        description: activity.description,
        createdAt: activity.createdAt.toISOString(),
      })),
    },
  };
}

Dashboard.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Dashboard;
