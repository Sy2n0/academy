import { type ReactElement, useMemo, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowRight,
  BarChart3,
  Clock,
  Search,
  Shield,
  SquareStack,
  Target,
  Trophy,
} from 'lucide-react';
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

  const enrolledCount = tracks.filter((track) => track.isEnrolled).length;
  const completedCount = tracks.filter((track) => track.isCompleted).length;
  const offensiveCount = tracks.filter(
    (track) => track.type === 'OFFENSIVE'
  ).length;
  const defensiveCount = tracks.filter(
    (track) => track.type === 'DEFENSIVE'
  ).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fundamental':
        return 'text-cyan-300';
      case 'Easy':
        return 'text-emerald-300';
      case 'Medium':
        return 'text-amber-300';
      case 'Hard':
        return 'text-rose-300';
      default:
        return 'text-foreground';
    }
  };

  const getTypeBadge = (type: Track['type']) => {
    if (type === 'OFFENSIVE') {
      return 'border-rose-400/60 bg-black/50 text-rose-300 backdrop-blur-sm';
    }
    return 'border-sky-400/60 bg-black/50 text-sky-300 backdrop-blur-sm';
  };

  return (
    <SidebarProvider defaultOpen={false}>
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
                    Track Paths
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            <section className="relative overflow-hidden rounded-md border border-border/40 bg-card/80 p-5 md:p-7">
              <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-rose-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-sky-500/10 blur-2xl" />

              <div className="relative space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Learn Tracks
                    </p>
                    <h1 className="font-mono text-2xl md:text-3xl uppercase text-foreground">
                      Track Paths
                    </h1>
                    <p className="font-mono text-xs text-muted-foreground mt-2 max-w-2xl">
                      Curated offensive and defensive journeys. Pick a path,
                      stay enrolled, and complete every module in sequence.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`font-mono text-xs uppercase ${
                        activeTab === 'all'
                          ? 'border-accent/60 bg-accent/20 text-foreground'
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
                      className={`font-mono text-xs uppercase ${
                        activeTab === 'offensive'
                          ? 'border-rose-500/45 bg-rose-500/15 text-rose-200'
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
                      className={`font-mono text-xs uppercase ${
                        activeTab === 'defensive'
                          ? 'border-sky-500/45 bg-sky-500/15 text-sky-200'
                          : ''
                      }`}
                      onClick={() => setActiveTab('defensive')}
                    >
                      Defensive
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Total
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {tracks.length}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Enrolled
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {enrolledCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Completed
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {completedCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Off/Def
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {offensiveCount}/{defensiveCount}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border/40 bg-card/70 p-4 md:p-5 space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Filter Control
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search path title or description"
                    className="pl-9 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`font-mono text-xs uppercase ${
                      sortBy === 'latest' ? 'bg-accent/20 border-accent/50' : ''
                    }`}
                    onClick={() => setSortBy('latest')}
                  >
                    Latest
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`font-mono text-xs uppercase ${
                      sortBy === 'difficulty'
                        ? 'bg-accent/20 border-accent/50'
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
                    className={`font-mono text-xs uppercase ${
                      sortBy === 'modules'
                        ? 'bg-accent/20 border-accent/50'
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
              <div className="rounded-md border border-border/30 bg-card/60 text-center py-12">
                <p className="font-mono text-sm text-muted-foreground">
                  Loading tracks...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-border/30 bg-card/60 text-center py-12">
                <p className="font-mono text-sm text-destructive">
                  트랙 목록을 불러오지 못했습니다
                </p>
              </div>
            )}

            {!isLoading && !error && processedTracks.length === 0 && (
              <div className="rounded-md border border-border/30 bg-card/60 text-center py-12">
                <p className="font-mono text-sm text-muted-foreground">
                  No tracks found
                </p>
              </div>
            )}

            {!isLoading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {processedTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => router.push(`/learn/tracks/${track.id}`)}
                    className="group relative overflow-hidden rounded-md border border-border/35 bg-card/80 hover:border-accent/50 transition-colors cursor-pointer"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
                      backgroundSize: '16px 16px',
                    }}
                  >
                    <div className="h-44 w-full relative bg-gradient-to-br from-background/80 to-accent/5 overflow-hidden border-b border-border/30">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide backdrop-blur-sm ${getTypeBadge(track.type)}`}
                        >
                          {track.type === 'OFFENSIVE' ? (
                            <Target className="h-3 w-3" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          {track.type}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-black/50 backdrop-blur-sm px-2 py-1 font-mono text-[10px] uppercase text-white/90">
                          <BarChart3 className="h-3 w-3" />
                          {track.difficulty}
                        </span>
                      </div>

                      <div className="absolute right-3 top-3 flex items-center gap-2">
                        {track.isCompleted && (
                          <span className="rounded-md border border-emerald-400/60 bg-black/50 backdrop-blur-sm px-2 py-1 font-mono text-[10px] uppercase text-emerald-300">
                            Completed
                          </span>
                        )}
                        {track.isEnrolled && !track.isCompleted && (
                          <span className="rounded-md border border-cyan-400/60 bg-black/50 backdrop-blur-sm px-2 py-1 font-mono text-[10px] uppercase text-cyan-300">
                            Enrolled
                          </span>
                        )}
                      </div>

                      {track.imageUrl ? (
                        <img
                          src={track.imageUrl}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-5xl">
                          <SquareStack className="h-14 w-14 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-mono text-base md:text-lg text-foreground leading-snug">
                          {track.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1 shrink-0" />
                      </div>

                      {track.description && (
                        <p className="font-mono text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {track.description}
                        </p>
                      )}

                      <div className="flex items-center flex-wrap gap-3 font-mono text-[11px] text-muted-foreground pt-1">
                        <span
                          className={`inline-flex items-center gap-1 ${getDifficultyColor(track.difficulty)}`}
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          {track.difficulty}
                        </span>
                        {track.duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {track.duration}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <SquareStack className="h-3.5 w-3.5" />
                          {track.moduleCount} Modules
                        </span>
                      </div>

                      <div className="pt-1">
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">
                          Enter Path
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
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
