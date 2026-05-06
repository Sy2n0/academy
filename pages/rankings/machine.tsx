import { type ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
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
  const { data, error, isLoading } = useSWR<RankingsResponse>('/api/rankings/machine', fetcher);

  const rankings = data?.data?.rankings || [];
  const userRanking = data?.data?.userRanking;

  // 디버깅: 데이터 확인
  if (typeof window !== 'undefined' && rankings.length > 0) {
    console.log('First ranking:', rankings[0]);
    console.log('Has lastMachine?', 'lastMachine' in rankings[0], rankings[0]?.lastMachine);
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

  // 랭크에 따른 배지 색상
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/20 text-gray-400 border-gray-400/30';
    if (rank === 3) return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    return 'bg-muted/20 text-muted-foreground border-border/30';
  };

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('en-US').format(points);
  };

  return (
    <>
      <Head>
        <title>MACHINE RANKINGS - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

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
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/rankings">Rankings</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs">MACHINE RANKINGS</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              {/* Main Content */}
              <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:p-8 md:pt-8">
                <div className="max-w-7xl mx-auto w-full">
                  {/* Header Section */}
                  <div className="mb-10 md:mb-12">
                    <h1 className="font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight text-foreground mb-3">
                      MACHINE RANKINGS
                    </h1>
                    <p className="font-mono text-sm text-muted-foreground max-w-2xl">
                      Machine Solve로 획득한 점수만 집계한 랭킹입니다
                    </p>
                  </div>

                  {/* User Ranking Info */}
                  {session?.user && userRanking && (
                    <div className="mb-6 p-5 border border-border/20 bg-background/30 backdrop-blur-sm rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                          <AvatarFallback className="bg-muted text-foreground font-mono text-sm">
                            {getInitials(session.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">Your Ranking</p>
                          <p className="font-mono text-base font-semibold text-foreground">
                            #{userRanking}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">Points</p>
                          <p className="font-mono text-base font-semibold text-foreground">
                            {formatPoints(
                              rankings.find((r) => r.id === session.user?.id)?.points || 0
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rankings Table */}
                  {isLoading ? (
                    <div className="text-center py-20">
                      <p className="font-mono text-sm text-muted-foreground">Loading rankings...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-20">
                      <p className="font-mono text-sm text-destructive">랭킹을 불러오지 못했습니다</p>
                    </div>
                  ) : rankings.length === 0 ? (
                    <div className="text-center py-20">
                      <p className="font-mono text-sm text-muted-foreground">No rankings available</p>
                    </div>
                  ) : (
                    <div className="border border-border/20 bg-background/30 backdrop-blur-sm rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/20 bg-background/40">
                              <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                                Rank
                              </th>
                              <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                                User
                              </th>
                              <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium min-w-[150px]">
                                Last Machine
                              </th>
                              <th className="px-5 py-3.5 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
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
                                  className={`border-b border-border/10 transition-colors ${
                                    isCurrentUser
                                      ? 'bg-accent/5 hover:bg-accent/8'
                                      : 'hover:bg-background/50'
                                  }`}
                                >
                                  <td className="px-5 py-4">
                                    <span
                                      className={`inline-flex items-center justify-center min-w-[2rem] h-7 rounded font-mono text-xs font-semibold ${getRankBadgeColor(
                                        rank
                                      )}`}
                                    >
                                      {rank}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-9 w-9">
                                        <AvatarImage src={user.image || undefined} alt={user.name} />
                                        <AvatarFallback className="bg-muted text-foreground font-mono text-[10px]">
                                          {getInitials(user.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="font-mono text-sm font-medium text-foreground truncate">
                                          {user.name}
                                          {isCurrentUser && (
                                            <span className="ml-1.5 text-[10px] text-accent font-normal">(You)</span>
                                          )}
                                        </p>
                                        <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                                          {user.email}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4" style={{ minWidth: '150px' }}>
                                    <div className="font-mono text-sm">
                                      {(user as any).lastMachine ? (
                                        <span className="text-foreground" title={(user as any).lastMachine}>
                                          {(user as any).lastMachine}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/60">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <p className="font-mono text-sm font-semibold text-foreground">
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
                  <div className="mt-12 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Rankings are updated in real-time
                    </p>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
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
