import { type ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
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

interface RankingUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  totalPoints: number;
  currentRank: number;
  machinePoints?: number;
  trackPoints?: number;
  playgroundPoints?: number;
}

interface RankingsResponse {
  data: {
    rankings: RankingUser[];
    userRanking: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Rankings: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR<RankingsResponse>(
    '/api/rankings',
    fetcher
  );

  const rankings = data?.data?.rankings || [];
  const userRanking = data?.data?.userRanking;

  // 사용자 이름의 이니셜 생성
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
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

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('en-US').format(points);
  };

  return (
    <>
      <Head>
        <title>TOTAL RANKINGS - HUB ACADEMY</title>
      </Head>

      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Total rankings' },
              ]}
            />

            {/* Main Content */}
            <div className="flex min-h-0 flex-1 flex-col p-4 pt-6 md:p-8 md:pt-8">
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
                {/* Header */}
                <div className="mb-6 shrink-0 md:mb-8">
                  <h1 className="mb-2 text-3xl tracking-tight text-foreground md:text-4xl">
                    TOTAL RANKINGS
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    종합 랭킹: MACHINES, LEARN, PLAYGROUND에서 획득한 모든
                    점수를 합산하여 순위를 매깁니다.
                  </p>
                </div>

                {/* User Ranking Info */}
                {session?.user && userRanking && (
                  <div className="mb-6 shrink-0 rounded-md border border-[var(--warp-rule)] p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={session.user.image || undefined}
                          alt={session.user.name || 'User'}
                        />
                        <AvatarFallback className="bg-muted text-foreground">
                          {getInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          Your Ranking
                        </p>
                        <p className="warp-num text-lg font-semibold text-foreground">
                          #{userRanking} Place
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rankings Table */}
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
                      No rankings available
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[var(--warp-rule)]">
                    <div className="min-h-0 flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-10 bg-[var(--warp-surface)]">
                          <tr className="border-b border-[var(--warp-rule)]">
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-muted-foreground">
                              Rank
                            </th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-muted-foreground">
                              User
                            </th>
                            <th className="px-6 py-4 text-right text-xs uppercase tracking-widest text-muted-foreground">
                              Points Breakdown
                            </th>
                            <th className="px-6 py-4 text-right text-xs uppercase tracking-widest text-muted-foreground">
                              Rank Level
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
                                    : 'hover:bg-background/80'
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`inline-flex items-center justify-center w-8 h-8 rounded border warp-num text-xs font-semibold ${getRankBadgeColor(
                                        rank
                                      )}`}
                                    >
                                      {rank}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage
                                        src={user.image || undefined}
                                        alt={user.name}
                                      />
                                      <AvatarFallback className="bg-muted text-foreground text-xs">
                                        {getInitials(user.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {user.name}
                                        {isCurrentUser && (
                                          <span className="ml-2 text-xs text-foreground">
                                            (You)
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-6">
                                    <div className="text-right">
                                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                        Machine
                                      </p>
                                      <p className="warp-num text-sm font-medium text-foreground">
                                        {formatPoints(
                                          (user as any).machinePoints || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                        Track
                                      </p>
                                      <p className="warp-num text-sm font-medium text-foreground">
                                        {formatPoints(
                                          (user as any).trackPoints || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                        Playground
                                      </p>
                                      <p className="warp-num text-sm font-medium text-foreground">
                                        {formatPoints(
                                          (user as any).playgroundPoints || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="text-right border-l border-[var(--warp-rule)] pl-6">
                                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                        Total
                                      </p>
                                      <p className="warp-num text-base font-semibold text-foreground">
                                        {formatPoints(user.totalPoints)}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="inline-flex items-center px-3 py-1 rounded border border-[var(--warp-rule)] bg-muted/20 warp-num text-xs text-muted-foreground">
                                    Rank {user.currentRank}
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

                {/* Footer Info */}
                <div className="mt-4 shrink-0 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Rankings are updated in real-time
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

Rankings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Rankings;
