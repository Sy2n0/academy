import {
  type ReactElement,
  type ComponentType,
  type ReactNode,
  useState,
  useEffect,
} from 'react';
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
import {
  Crown,
  Server,
  GraduationCap,
  Flame,
  Info,
  Snowflake,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { getSession } from '@/lib/session';
import { getUserBySession, updateUser } from 'models/user';
import {
  getUserScoreStats,
  getUserRanking,
  getUserScoreHistory,
} from 'models/score';
import {
  calculateRank,
  getRankInfo,
  getRankProgress,
  getPointsToNextRank,
} from '@/lib/ranks';
import Head from 'next/head';

type DashboardProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const numberFormatter = new Intl.NumberFormat('en-US');
const WEEKLY_POINTS_GOAL = 200;
const STREAK_SAVERS = 3;

// Premium elevated card surface.
const CARD = 'rounded-xl border border-border/50 bg-card';

function ClientDate({ dateStr }: { dateStr: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  return (
    <span className="text-[11px] text-muted-foreground">
      {new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <Icon className="h-4 w-4 text-primary/80" />
      <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

const Dashboard: NextPageWithLayout<DashboardProps> = ({
  name,
  image,
  stats,
  rankInfo,
  ranking,
  nextRank,
  weekStreak,
  bestWeekStreak,
  weeklyPoints,
  recentActivity,
}) => {
  const machineCount = stats.byType.MACHINE?.count || 0;
  const trackCount = stats.byType.TRACK?.count || 0;
  const weeklyPct = Math.min(
    100,
    Math.round((weeklyPoints / WEEKLY_POINTS_GOAL) * 100)
  );
  const initials = (name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/40">
                <div className="flex items-center gap-2 px-6 md:px-10">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-sm font-medium">
                          Dashboard
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-5 md:p-8">
                {/* profile header */}
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/25 to-primary/5 text-lg font-bold text-primary shadow-[0_0_22px_rgba(63,224,127,0.2)]">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={name || 'avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {name || 'Hacker'}
                      </h1>
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {rankInfo.name}
                      </span>
                      <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        LV {rankInfo.level}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      Global #{ranking} ·{' '}
                      <span className="text-primary">
                        {numberFormatter.format(stats.totalPoints)} pts
                      </span>
                    </p>
                  </div>
                  <button className="hidden items-center gap-1 rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/70 sm:flex">
                    View Profile
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* hero row */}
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* rank meter */}
                  <div className={`${CARD} flex flex-col p-6`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="uppercase tracking-wider text-muted-foreground">
                        Current Rank
                      </span>
                      <span className="text-muted-foreground">
                        Lv {rankInfo.level} · {rankInfo.hex}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-center py-3">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {rankInfo.name}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {numberFormatter.format(stats.totalPoints)} pts earned
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">
                          {nextRank ? `→ ${nextRank}` : 'MAX'}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-background/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                          style={{
                            width: nextRank
                              ? `${Math.max(rankInfo.progress, 2)}%`
                              : '100%',
                          }}
                        />
                      </div>
                      <div className="mt-2.5 text-xs text-muted-foreground">
                        {nextRank
                          ? `${numberFormatter.format(rankInfo.pointsToNext)} pts to next rank · ${rankInfo.progress.toFixed(0)}%`
                          : 'Max rank reached'}
                      </div>
                    </div>
                  </div>

                  {/* score + stats */}
                  <div className={`${CARD} flex flex-col p-6`}>
                    <span className="text-[13px] text-muted-foreground">
                      Total Score
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                        {numberFormatter.format(stats.totalPoints)}
                      </span>
                      <span className="text-sm text-muted-foreground">pts</span>
                    </div>
                    <div className="mt-auto grid grid-cols-3 gap-4 border-t border-border/40 pt-5">
                      <MiniStat
                        icon={Crown}
                        label="Global rank"
                        value={`#${ranking}`}
                      />
                      <MiniStat
                        icon={Server}
                        label="Machines"
                        value={machineCount}
                      />
                      <MiniStat
                        icon={GraduationCap}
                        label="Tracks"
                        value={trackCount}
                      />
                    </div>
                  </div>

                  {/* weekly streak */}
                  <div className={`${CARD} p-6`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-foreground">
                        Weekly Streak
                      </span>
                      <Info className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Flame
                        className="h-7 w-7 text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.55)]"
                        fill="currentColor"
                      />
                      <span className="text-3xl font-bold tracking-tight text-foreground">
                        {weekStreak}{' '}
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {weekStreak === 1 ? 'week' : 'weeks'}
                        </span>
                      </span>
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">
                          Weekly Points
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {weeklyPoints}/{WEEKLY_POINTS_GOAL}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                          style={{
                            width: `${Math.max(weeklyPct, weeklyPoints > 0 ? 4 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="my-4 border-t border-border/40" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">
                        Streak Saver
                      </span>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: STREAK_SAVERS }).map((_, i) => (
                          <span
                            key={i}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground/70"
                          >
                            <Snowflake className="h-3.5 w-3.5" />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="my-4 border-t border-border/40" />
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Personal best: {bestWeekStreak}{' '}
                      {bestWeekStreak === 1 ? 'week' : 'weeks'}
                    </div>
                  </div>
                </div>

                {/* recent activity */}
                <div className={CARD}>
                  <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
                    <span className="text-[15px] font-semibold text-foreground">
                      Recent Activity
                    </span>
                    <span className="cursor-pointer text-xs text-primary">
                      View all
                    </span>
                  </div>
                  {recentActivity.length > 0 ? (
                    <div className="max-h-[360px] overflow-y-auto p-2 no-scrollbar">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-[11px] font-bold text-primary">
                            {activity.type.slice(0, 1)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">
                              {activity.description ||
                                `${activity.type} completed`}
                            </p>
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <ClientDate dateStr={activity.createdAt} />
                              <span className="text-muted-foreground/40">
                                ·
                              </span>
                              {activity.type}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-primary">
                            +{activity.earnedPoints}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                      <Flame className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        No activity yet — start solving to earn points.
                      </p>
                    </div>
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

  const [stats, ranking, history] = await Promise.all([
    getUserScoreStats(user.id),
    getUserRanking(user.id),
    getUserScoreHistory(user.id, undefined, 400),
  ]);

  // Weekly streak / weekly points — 7-day weeks bucketed in Asia/Seoul.
  const DAY_MS = 86_400_000;
  const nowMs = Date.now();
  const weekOf = (ms: number) =>
    Math.floor(Math.floor((ms + 9 * 3_600_000) / DAY_MS) / 7);

  const curWeek = weekOf(nowMs);
  const activeWeeks = new Set<number>();
  let weeklyPoints = 0;
  for (const h of history) {
    const w = weekOf(new Date(h.createdAt).getTime());
    activeWeeks.add(w);
    if (w === curWeek) weeklyPoints += h.earnedPoints ?? 0;
  }

  let weekStreak = 0;
  for (let i = 0; i < 520; i++) {
    if (activeWeeks.has(curWeek - i)) weekStreak++;
    else if (i > 0) break;
  }
  let bestWeekStreak = 0;
  let run = 0;
  let prevWeek: number | null = null;
  for (const w of Array.from(activeWeeks).sort((a, b) => a - b)) {
    run = prevWeek !== null && w === prevWeek + 1 ? run + 1 : 1;
    if (run > bestWeekStreak) bestWeekStreak = run;
    prevWeek = w;
  }

  const recentActivity = history.slice(0, 10);

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
  const nextRankRaw = getRankInfo(calculatedRank + 1);
  const nextRank =
    nextRankRaw.level === calculatedRank + 1 ? nextRankRaw.name : null;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      name: user.name ?? null,
      image: user.image ?? null,
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
      nextRank,
      weekStreak,
      bestWeekStreak,
      weeklyPoints,
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
