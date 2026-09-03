/* eslint-disable i18next/no-literal-string */
import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Head from 'next/head';
import useSWR from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';

interface PlaygroundRankingUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  currentRank: number;
  points: number;
  lastMachine: string | null;
  firstBloodCount: number;
}

interface PlaygroundRankingsResponse {
  data: {
    rankings: PlaygroundRankingUser[];
    userRanking: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const numberFormatter = new Intl.NumberFormat('en-US');

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Position reads from brightness rather than medal colour — the Warp palette
// carries no accent, and parchment/ash/stone already order the top three.
const getRankBadgeColor = (rank: number) => {
  if (rank === 1)
    return 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-[var(--warp-parchment)]';
  if (rank === 2)
    return 'border-[var(--warp-ash)]/40 bg-[var(--warp-ash)]/5 text-[var(--warp-ash)]';
  if (rank === 3)
    return 'border-[var(--warp-stone)]/40 text-[var(--warp-stone)]';
  return 'border-[var(--warp-rule)] text-muted-foreground';
};

const PlaygroundRankings: NextPageWithLayout = () => {
  const { data: session } = useSession();

  // No season parameter on purpose. The board on /playground resets with each
  // season; this one is the standing across all of them, so it asks for the
  // unscoped total.
  const { data, error, isLoading } = useSWR<PlaygroundRankingsResponse>(
    '/api/rankings/playground',
    fetcher
  );

  const rankings = data?.data?.rankings || [];
  const userRanking = data?.data?.userRanking;
  const me = rankings.find((r) => r.id === session?.user?.id);
  const totalPoints = rankings.reduce((sum, r) => sum + r.points, 0);
  const totalFirstBloods = rankings.reduce(
    (sum, r) => sum + r.firstBloodCount,
    0
  );

  return (
    <>
      <Head>
        <title>PLAYGROUND RANKINGS - HUB ACADEMY</title>
      </Head>

      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Rankings', href: '/rankings' },
                { label: 'Playground' },
              ]}
            />

            <div className="flex min-h-0 flex-1 flex-col p-4 pt-6 md:p-8 md:pt-8">
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
                <div className="mb-6 shrink-0 md:mb-8">
                  <h1 className="mb-2 text-3xl tracking-tight text-foreground md:text-4xl">
                    PLAYGROUND RANKINGS
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    지난 시즌을 포함한 전체 누적 순위입니다. 진행 중인 시즌만
                    보려면 Playground 페이지의 리더보드를 보세요.
                  </p>
                </div>

                <div className="mb-6 flex shrink-0 flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-[var(--warp-rule)] py-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>
                    <span className="warp-num text-foreground">
                      {rankings.length}
                    </span>{' '}
                    players
                  </span>
                  <span>
                    <span className="warp-num text-foreground">
                      {numberFormatter.format(totalPoints)}
                    </span>{' '}
                    points
                  </span>
                  <span>
                    <span className="warp-num text-foreground">
                      {totalFirstBloods}
                    </span>{' '}
                    first bloods
                  </span>
                </div>

                {me && (
                  <div className="mb-6 shrink-0 rounded-md border border-[var(--warp-rule)] p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={me.image || undefined}
                          alt={me.name || 'User'}
                        />
                        <AvatarFallback className="bg-muted text-foreground">
                          {getInitials(me.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Your standing
                        </p>
                        <p className="warp-num mt-1 text-lg font-medium text-foreground">
                          #{userRanking} · {numberFormatter.format(me.points)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Loading rankings...
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    <p className="text-sm text-destructive">
                      랭킹을 불러오지 못했습니다
                    </p>
                  </div>
                ) : rankings.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No solves yet
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[var(--warp-rule)]">
                    <div className="min-h-0 flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-10 bg-[var(--warp-surface)]">
                          <tr className="border-b border-[var(--warp-rule)]">
                            <th className="px-5 py-3.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                              Rank
                            </th>
                            <th className="px-5 py-3.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                              User
                            </th>
                            <th className="hidden px-5 py-3.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground md:table-cell">
                              Last solve
                            </th>
                            <th className="px-5 py-3.5 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                              First blood
                            </th>
                            <th className="px-5 py-3.5 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                              Points
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankings.map((user, index) => {
                            const rank = index + 1;
                            const isCurrentUser = session?.user?.id === user.id;

                            return (
                              <tr
                                key={user.id}
                                className={`border-b border-[var(--warp-rule)] transition-colors ${
                                  isCurrentUser
                                    ? 'bg-[var(--warp-veil)] hover:bg-white/[0.06]'
                                    : 'hover:bg-white/[0.03]'
                                }`}
                              >
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`warp-num inline-flex h-7 min-w-[2rem] items-center justify-center rounded border text-xs font-semibold ${getRankBadgeColor(
                                      rank
                                    )}`}
                                  >
                                    {rank}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={user.image || undefined}
                                        alt={user.name}
                                      />
                                      <AvatarFallback className="bg-muted text-[10px] text-foreground">
                                        {getInitials(user.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">
                                        {user.name}
                                        {isCurrentUser && (
                                          <span className="ml-1.5 text-[10px] font-normal text-foreground">
                                            (You)
                                          </span>
                                        )}
                                      </p>
                                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="hidden px-5 py-3.5 md:table-cell">
                                  <span className="block max-w-[16rem] truncate text-xs text-muted-foreground">
                                    {user.lastMachine || '—'}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <span
                                    className={`warp-num text-sm ${
                                      user.firstBloodCount > 0
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {user.firstBloodCount}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <span className="warp-num text-sm text-foreground">
                                    {numberFormatter.format(user.points)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-4 shrink-0 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    All seasons combined
                  </p>
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

PlaygroundRankings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PlaygroundRankings;
