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

interface SandboxRankingUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  currentRank: number;
  solved: number;
  byCategory: Record<string, number>;
  lastSolvedAt: string | null;
  points: number;
}

interface SandboxRankingsResponse {
  data: {
    rankings: SandboxRankingUser[];
    totalProblems: number;
    categoryTotals: Record<string, number>;
    userRanking: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

/**
 * A completion meter rather than a score bar. The sandbox is a fixed set of
 * problems, so the honest unit is "how much of it is finished" — the track is
 * always the full width and the fill is the share solved.
 */
function Meter({ solved, total }: { solved: number; total: number }) {
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div className="h-px w-full bg-[var(--warp-rule)]">
      <div
        className="h-px bg-[var(--warp-parchment)]"
        style={{ width: `${Math.max(pct, solved > 0 ? 1 : 0)}%` }}
      />
    </div>
  );
}

const SandboxRankings: NextPageWithLayout = () => {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR<SandboxRankingsResponse>(
    '/api/rankings/sandbox',
    fetcher
  );

  const rankings = data?.data?.rankings || [];
  const totalProblems = data?.data?.totalProblems ?? 0;
  const categoryTotals = data?.data?.categoryTotals ?? {};
  const userRanking = data?.data?.userRanking;

  // Stable column order so the table header and every row agree.
  const categories = Object.keys(categoryTotals).sort();
  const me = rankings.find((r) => r.id === session?.user?.id);

  return (
    <>
      <Head>
        <title>SANDBOX RANKINGS - HUB ACADEMY</title>
      </Head>

      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Rankings', href: '/rankings' },
                { label: 'Sandbox' },
              ]}
            />

            <div className="flex min-h-0 flex-1 flex-col p-4 pt-6 md:p-8 md:pt-8">
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
                <div className="mb-6 shrink-0 md:mb-8">
                  <h1 className="mb-2 text-3xl tracking-tight text-foreground md:text-4xl">
                    SANDBOX RANKINGS
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    샌드박스는 정해진 문제 묶음입니다. 점수 경쟁이 아니라 얼마나
                    끝냈는지로 줄을 세웁니다.
                  </p>
                </div>

                {/* Curriculum shape — states the denominators the rows use. */}
                <div className="mb-6 flex shrink-0 flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-[var(--warp-rule)] py-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>
                    <span className="warp-num text-foreground">
                      {totalProblems}
                    </span>{' '}
                    problems
                  </span>
                  {categories.map((c) => (
                    <span key={c}>
                      {c}{' '}
                      <span className="warp-num text-foreground">
                        {categoryTotals[c]}
                      </span>
                    </span>
                  ))}
                  <span className="ml-auto">
                    <span className="warp-num text-foreground">
                      {rankings.length}
                    </span>{' '}
                    solvers
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
                          #{userRanking} · {me.solved}/{totalProblems}
                        </p>
                        <div className="mt-3">
                          <Meter solved={me.solved} total={totalProblems} />
                        </div>
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
                            <th className="w-[34%] px-5 py-3.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                              Progress
                            </th>
                            {categories.map((c) => (
                              <th
                                key={c}
                                className="hidden px-5 py-3.5 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground lg:table-cell"
                              >
                                {c}
                              </th>
                            ))}
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
                                    className={`inline-flex h-7 min-w-[2rem] items-center justify-center rounded border warp-num text-xs font-semibold ${getRankBadgeColor(
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
                                <td className="px-5 py-3.5">
                                  <div className="flex items-baseline justify-between gap-3 text-xs">
                                    <span className="warp-num text-foreground">
                                      {user.solved}/{totalProblems}
                                    </span>
                                    <span className="warp-num text-muted-foreground">
                                      {totalProblems > 0
                                        ? Math.round(
                                            (user.solved / totalProblems) * 100
                                          )
                                        : 0}
                                      %
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <Meter
                                      solved={user.solved}
                                      total={totalProblems}
                                    />
                                  </div>
                                </td>
                                {categories.map((c) => {
                                  const done = user.byCategory[c] ?? 0;
                                  const of = categoryTotals[c] ?? 0;
                                  return (
                                    <td
                                      key={c}
                                      className="hidden px-5 py-3.5 text-right lg:table-cell"
                                    >
                                      <span
                                        className={`warp-num text-xs ${
                                          done === of && of > 0
                                            ? 'text-foreground'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {done}/{of}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className="px-5 py-3.5 text-right">
                                  <span className="warp-num text-sm text-muted-foreground">
                                    {new Intl.NumberFormat('en-US').format(
                                      user.points
                                    )}
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
                    Ranked by problems solved
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

SandboxRankings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default SandboxRankings;
