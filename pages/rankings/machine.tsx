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
  points: number;
  currentRank: number;
  lastMachine?: string | null;
}

interface RankingsResponse {
  data: {
    rankings: RankingUser[];
    userRanking: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MachineRankings: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR<RankingsResponse>(
    '/api/rankings/machine',
    fetcher
  );

  const rankings = data?.data?.rankings || [];
  const userRanking = data?.data?.userRanking;

  // 디버깅: 데이터 확인
  if (typeof window !== 'undefined' && rankings.length > 0) {
    console.log('First ranking:', rankings[0]);
    console.log(
      'Has lastMachine?',
      'lastMachine' in rankings[0],
      rankings[0]?.lastMachine
    );
  }

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
        <title>MACHINE RANKINGS - HUB ACADEMY</title>
      </Head>

      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Rankings', href: '/rankings' },
                { label: 'Machine' },
              ]}
            />

            {/* Main Content */}
            <div className="flex min-h-0 flex-1 flex-col p-4 pt-6 md:p-8 md:pt-8">
              <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
                {/* Header Section */}
                <div className="mb-6 shrink-0 md:mb-8">
                  <h1 className="mb-2 text-3xl tracking-tight text-foreground md:text-4xl">
                    MACHINE RANKINGS
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    Machine Solve로 획득한 점수만 집계한 랭킹입니다
                  </p>
                </div>

                {/* User Ranking Info */}
                {session?.user && userRanking && (
                  <div className="mb-6 shrink-0 rounded-md border border-[var(--warp-rule)] p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-11 w-11">
                        <AvatarImage
                          src={session.user.image || undefined}
                          alt={session.user.name || 'User'}
                        />
                        <AvatarFallback className="bg-muted text-foreground text-sm">
                          {getInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                          Your Ranking
                        </p>
                        <p className="warp-num text-base font-semibold text-foreground">
                          #{userRanking}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                          Points
                        </p>
                        <p className="warp-num text-base font-semibold text-foreground">
                          {formatPoints(
                            rankings.find((r) => r.id === session.user?.id)
                              ?.points || 0
                          )}
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
                            <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                              Rank
                            </th>
                            <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                              User
                            </th>
                            <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium min-w-[150px]">
                              Last Machine
                            </th>
                            <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
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
                                    : 'hover:bg-background/50'
                                }`}
                              >
                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[2rem] h-7 rounded warp-num text-xs font-semibold ${getRankBadgeColor(
                                      rank
                                    )}`}
                                  >
                                    {rank}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage
                                        src={user.image || undefined}
                                        alt={user.name}
                                      />
                                      <AvatarFallback className="bg-muted text-foreground text-[10px]">
                                        {getInitials(user.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {user.name}
                                        {isCurrentUser && (
                                          <span className="ml-1.5 text-[10px] text-foreground font-normal">
                                            (You)
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td
                                  className="px-5 py-4"
                                  style={{ minWidth: '150px' }}
                                >
                                  <div className="text-sm">
                                    {(user as any).lastMachine ? (
                                      <span
                                        className="text-foreground"
                                        title={(user as any).lastMachine}
                                      >
                                        {(user as any).lastMachine}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">
                                        -
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <p className="warp-num text-sm font-semibold text-foreground">
                                    {formatPoints(user.points)}
                                  </p>
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

MachineRankings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default MachineRankings;
