import { type ReactElement, type ReactNode, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getSession } from '@/lib/session';
import { getUserBySession, updateUser } from 'models/user';
import {
  getUserScoreStats,
  getUserRanking,
  getUserScoreHistory,
  getUserActivity,
  getUserActivityWeeks,
} from 'models/score';
import {
  calculateRank,
  getRankInfo,
  getRankProgress,
  getPointsToNextRank,
} from '@/lib/ranks';
import Head from 'next/head';
import { Flame } from 'lucide-react';

type DashboardProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const numberFormatter = new Intl.NumberFormat('en-US');
const WEEKLY_POINTS_GOAL = 200;

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

function Fact({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  // Sits inline with the number, not above the label — an icon stacked over a
  // caption reads as decoration, next to the value it reads as part of it.
  icon?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 flex items-center gap-1.5 text-lg font-medium text-foreground">
        {icon}
        <span className="warp-num">{value}</span>
      </dd>
      {note ? (
        <dd className="mt-0.5 text-[11px] text-muted-foreground">{note}</dd>
      ) : null}
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
              <AppTopBar crumbs={[{ label: 'Dashboard' }]} />

              <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col p-5 md:px-10 md:py-12">
                {/* Identity. Rank, level and global position are stated here and
                    nowhere else on the page. */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-[var(--warp-surface)] text-sm font-medium text-foreground">
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
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg font-medium tracking-tight text-foreground">
                      {name || 'Unnamed'}
                    </h1>
                    <p className="warp-num mt-1 text-[13px] text-muted-foreground">
                      {rankInfo.name} · Lv {rankInfo.level} · Global #{ranking}
                    </p>
                  </div>
                </div>

                {/* From lg up the page splits: the score rail on the left, the
                    running feed on the right, divided by a vertical hairline. A
                    single centred column left the content floating in empty
                    canvas — this spends the width on structure rather than
                    stretching every activity row across it. */}
                <div className="mt-12 grid gap-x-12 gap-y-14 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    {/* The one number this page is about. Nothing else competes
                        with it for size, so no accent colour is needed to rank
                        them. */}
                    <div className="flex items-baseline gap-2.5">
                      <span className="warp-num text-6xl font-medium leading-none tracking-tight text-foreground">
                        {numberFormatter.format(stats.totalPoints)}
                      </span>
                      <span className="text-sm text-muted-foreground">pts</span>
                    </div>

                    {/* Progress rides the section hairline rather than a pill,
                        so it reads as part of the page rule, not as a widget. */}
                    <div className="mt-7 h-px w-full bg-[var(--warp-rule)]">
                      <div
                        className="h-px bg-[var(--warp-parchment)]"
                        style={{
                          width: nextRank
                            ? `${Math.max(rankInfo.progress, 1)}%`
                            : '100%',
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-4 text-[13px] text-muted-foreground">
                      <span>
                        {nextRank ? (
                          <>
                            <span className="warp-num">
                              {numberFormatter.format(rankInfo.pointsToNext)}
                            </span>{' '}
                            pts to {nextRank}
                          </>
                        ) : (
                          'Max rank reached'
                        )}
                      </span>
                      <span className="warp-num shrink-0">
                        {rankInfo.progress.toFixed(0)}%
                      </span>
                    </div>

                    {/* Supporting facts — each is a number the headline does not
                        already say. No cards, no icons. */}
                    <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-[var(--warp-rule)] pt-7">
                      <Fact
                        label="Streak"
                        value={`${weekStreak}w`}
                        note={`Best ${bestWeekStreak}w`}
                        icon={
                          <Flame
                            className={
                              weekStreak > 0
                                ? 'h-[18px] w-[18px] text-foreground'
                                : 'h-[18px] w-[18px] text-muted-foreground/40'
                            }
                            fill="currentColor"
                            aria-hidden="true"
                          />
                        }
                      />
                      <Fact
                        label="This week"
                        value={numberFormatter.format(weeklyPoints)}
                        note={`Goal ${WEEKLY_POINTS_GOAL}`}
                      />
                      <Fact label="Machines" value={machineCount} />
                      <Fact label="Tracks" value={trackCount} />
                    </dl>
                  </div>

                  {/* Activity. Hairline-separated rows instead of a bordered
                      card — the same containment idiom the landing uses. */}
                  <section className="lg:col-span-7 lg:border-l lg:border-[var(--warp-rule)] lg:pl-12">
                    <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Recent activity
                    </h2>
                    {recentActivity.length > 0 ? (
                      <ul className="mt-4 max-h-[490px] overflow-y-auto border-t border-[var(--warp-rule)]">
                        {recentActivity.map((activity) => (
                          <li
                            key={activity.id}
                            className="flex items-baseline gap-4 border-b border-[var(--warp-rule)] py-3.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {activity.description ||
                                `${activity.type} completed`}
                            </span>
                            <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
                              {activity.type}
                            </span>
                            {/* "+0" reads as "earned nothing"; these events
                                mostly have no score row at all, which is a
                                different thing. */}
                            <span
                              className={`warp-num w-12 shrink-0 text-right text-sm ${
                                activity.earnedPoints > 0
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {activity.earnedPoints > 0
                                ? `+${activity.earnedPoints}`
                                : '—'}
                            </span>
                            <span className="warp-num hidden w-24 shrink-0 text-right sm:inline">
                              <ClientDate dateStr={activity.createdAt} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 border-t border-[var(--warp-rule)] py-8 text-sm text-muted-foreground">
                        Nothing yet. Points appear here as you solve.
                      </p>
                    )}
                  </section>
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

  const [stats, ranking, history, activity] = await Promise.all([
    getUserScoreStats(user.id),
    getUserRanking(user.id),
    getUserScoreHistory(user.id, undefined, 400),
    getUserActivity(user.id, 50),
  ]);

  // Weekly streak / weekly points — 7-day weeks bucketed in Asia/Seoul.
  const DAY_MS = 86_400_000;
  const nowMs = Date.now();
  const weekOf = (ms: number) =>
    Math.floor(Math.floor((ms + 9 * 3_600_000) / DAY_MS) / 7);

  const curWeek = weekOf(nowMs);
  const activeWeeks = new Set<number>();
  let weeklyPoints = 0;
  // Points come from the ledger; the streak comes from activity, so weeks spent
  // on things that award nothing still count as weeks you showed up.
  for (const h of history) {
    if (weekOf(new Date(h.createdAt).getTime()) === curWeek) {
      weeklyPoints += h.earnedPoints ?? 0;
    }
  }
  for (const a of await getUserActivityWeeks(user.id)) {
    activeWeeks.add(weekOf(a.getTime()));
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
      recentActivity: activity.map((entry) => ({
        id: entry.id,
        type: entry.type,
        earnedPoints: entry.earnedPoints,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
      })),
    },
  };
}

Dashboard.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Dashboard;
