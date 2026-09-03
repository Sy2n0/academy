import { type ReactElement, useEffect, useMemo, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { StatBar } from '@/components/layouts/StatBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SquareStack } from 'lucide-react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

interface Track {
  id: string;
  title: string;
  description: string | null;
  type: 'OFFENSIVE' | 'DEFENSIVE';
  difficulty: string;
  duration: string | null;
  imageUrl: string | null;
  moduleCount: number;
  completedModuleCount: number;
  isEnrolled: boolean;
  isCompleted: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  return res.json();
};

const TracksPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'offensive' | 'defensive'>(
    'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'latest' | 'difficulty' | 'modules'>(
    'latest'
  );

  const apiUrl =
    activeTab === 'all'
      ? '/api/learn/tracks'
      : activeTab === 'offensive'
        ? '/api/learn/tracks?type=OFFENSIVE'
        : '/api/learn/tracks?type=DEFENSIVE';

  const { data, error, isLoading } = useSWR<{ data: Track[] }>(apiUrl, fetcher);
  const tracks = data?.data || [];

  const difficultyScore: Record<string, number> = {
    Fundamental: 0,
    Easy: 1,
    Medium: 2,
    Hard: 3,
  };

  const processedTracks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const filtered = tracks.filter((track) => {
      if (!keyword) {
        return true;
      }

      const haystack = [
        track.title,
        track.description || '',
        track.type,
        track.difficulty,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'modules') {
        return b.moduleCount - a.moduleCount;
      }
      if (sortBy === 'difficulty') {
        return (
          (difficultyScore[b.difficulty] ?? -1) -
          (difficultyScore[a.difficulty] ?? -1)
        );
      }
      return 0;
    });

    return sorted;
  }, [tracks, searchTerm, sortBy]);

  // The page rendered every track it was given — fine at one, not at a hundred.
  // Matches the modules list, which already paginates client-side.
  const TRACKS_PER_PAGE = 9;
  const totalPages = Math.max(
    1,
    Math.ceil(processedTracks.length / TRACKS_PER_PAGE)
  );
  const pagedTracks = processedTracks.slice(
    (currentPage - 1) * TRACKS_PER_PAGE,
    currentPage * TRACKS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const enrolledCount = tracks.filter((track) => track.isEnrolled).length;
  const completedCount = tracks.filter((track) => track.isCompleted).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fundamental':
        return 'text-[var(--warp-stone)]';
      case 'Easy':
        return 'text-[var(--warp-ash)]';
      case 'Medium':
      case 'Hard':
        return 'text-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="h-svh overflow-hidden bg-background">
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <AppTopBar
            crumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Learn' },
              { label: 'Tracks' },
            ]}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1240px] p-5 md:px-10 md:py-8">
              <section>
                <div className="relative space-y-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <h1 className="text-3xl tracking-tight text-foreground md:text-4xl">
                        Tracks
                      </h1>
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        모듈을 순서대로 묶은 학습 경로입니다. 등록하면 진행률이
                        여기에 쌓입니다.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`text-xs uppercase ${
                          activeTab === 'all'
                            ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-foreground'
                            : ''
                        }`}
                        onClick={() => setActiveTab('all')}
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`text-xs uppercase ${
                          activeTab === 'offensive'
                            ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-foreground'
                            : ''
                        }`}
                        onClick={() => setActiveTab('offensive')}
                      >
                        Offensive
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`text-xs uppercase ${
                          activeTab === 'defensive'
                            ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-foreground'
                            : ''
                        }`}
                        onClick={() => setActiveTab('defensive')}
                      >
                        Defensive
                      </Button>
                    </div>
                  </div>

                  <StatBar
                    stats={[
                      { label: 'Tracks', value: tracks.length },
                      { label: 'Enrolled', value: enrolledCount },
                      { label: 'Completed', value: completedCount },
                      {
                        label: 'Modules done',
                        value: `${tracks.reduce(
                          (n, t) => n + (t.completedModuleCount ?? 0),
                          0
                        )}/${tracks.reduce((n, t) => n + (t.moduleCount ?? 0), 0)}`,
                      },
                    ]}
                  />
                </div>
              </section>

              <section className="mt-8 border-b border-[var(--warp-rule)] pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search path title or description"
                      className="pl-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs uppercase ${
                        sortBy === 'latest'
                          ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10'
                          : ''
                      }`}
                      onClick={() => setSortBy('latest')}
                    >
                      Latest
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs uppercase ${
                        sortBy === 'difficulty'
                          ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10'
                          : ''
                      }`}
                      onClick={() => setSortBy('difficulty')}
                    >
                      Difficulty
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs uppercase ${
                        sortBy === 'modules'
                          ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10'
                          : ''
                      }`}
                      onClick={() => setSortBy('modules')}
                    >
                      Modules
                    </Button>
                  </div>
                </div>
              </section>

              {isLoading && (
                <div className="rounded-md border border-[var(--warp-rule)]  text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    Loading tracks...
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-[var(--warp-rule)]  text-center py-12">
                  <p className="text-sm text-destructive">
                    트랙 목록을 불러오지 못했습니다
                  </p>
                </div>
              )}

              {!isLoading && !error && processedTracks.length === 0 && (
                <div className="rounded-md border border-[var(--warp-rule)]  text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No tracks found
                  </p>
                </div>
              )}

              {/* A grid rather than full-width bands: at one track the card
                  keeps its natural width instead of stretching across the page,
                  and at thirty it stays scannable instead of becoming a
                  four-thousand-pixel scroll. */}
              {!isLoading && !error && (
                <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedTracks.map((track) => {
                    const done = track.completedModuleCount ?? 0;
                    const total = track.moduleCount ?? 0;
                    const pct =
                      total > 0 ? Math.round((done / total) * 100) : 0;

                    return (
                      <li key={track.id} className="flex">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/learn/tracks/${track.id}`)
                          }
                          className="group flex w-full flex-col overflow-hidden rounded-md border border-[var(--warp-rule)] text-left transition-colors hover:border-[var(--warp-ash)]/40"
                        >
                          {/* Cover art is real content on a track — unlike the
                              modules cards, which banded a gradient. No overlay
                              on it. */}
                          <span className="block aspect-[16/9] w-full overflow-hidden border-b border-[var(--warp-rule)] bg-[var(--warp-surface)]">
                            {track.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={track.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center">
                                <SquareStack className="h-7 w-7 text-muted-foreground" />
                              </span>
                            )}
                          </span>

                          <span className="flex flex-1 flex-col p-4">
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                {track.title}
                              </span>
                              {track.isCompleted && (
                                <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-foreground">
                                  Done
                                </span>
                              )}
                            </span>

                            {track.description && (
                              <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                                {track.description}
                              </span>
                            )}

                            {/* A track is a container of modules, so how far
                                through it you are is the number that matters. */}
                            <span className="mt-auto block pt-4">
                              <span className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                <span className="warp-num text-foreground">
                                  {done}/{total}
                                </span>
                                <span className="warp-num">{pct}%</span>
                              </span>
                              <span className="mt-2 block h-px w-full bg-[var(--warp-rule)]">
                                <span
                                  className={`block h-px ${track.isCompleted ? 'bg-[var(--warp-parchment)]' : 'bg-[var(--warp-ash)]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                              <span className="mt-2 flex flex-wrap gap-x-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                <span
                                  className={getDifficultyColor(
                                    track.difficulty
                                  )}
                                >
                                  {track.difficulty}
                                </span>
                                {track.duration && track.duration !== '0' && (
                                  <span className="warp-num">
                                    {track.duration}
                                  </span>
                                )}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!isLoading && !error && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <span className="warp-num px-2 text-xs text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
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

TracksPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default TracksPage;
