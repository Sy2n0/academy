import { type ReactElement, useEffect, useMemo, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { StatBar } from '@/components/layouts/StatBar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ChevronDown, Heart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/router';
import useSWR from 'swr';

interface Module {
  id: string;
  title: string;
  image: string;
  type: 'REGULAR' | 'PREMIUM';
  category: 'GENERAL' | 'OFFENSIVE' | 'DEFENSIVE';
  difficulty: 'Fundamental' | 'Easy' | 'Medium' | 'Hard';
  duration: string;
  tier: string;
  progress?: number;
  status?: 'In Progress' | 'Completed' | 'Not Started';
  isCompleted?: boolean;
  isFavourite?: boolean;
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

const ModulesPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'favourite'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewBy, setViewBy] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState(1);

  const MODULES_PER_PAGE = 8;

  // 실제 데이터 가져오기
  const { data, error, isLoading } = useSWR<{ data: Module[] }>(
    '/api/learn/modules',
    fetcher
  );

  const modules = data?.data || [];

  const filteredModules = modules.filter((module) => {
    if (activeTab === 'favourite' && !module.isFavourite) return false;
    if (selectedCategory !== 'all' && module.category !== selectedCategory)
      return false;
    if (
      selectedDifficulty !== 'all' &&
      module.difficulty !== selectedDifficulty
    )
      return false;
    if (selectedTier !== 'all' && module.tier !== selectedTier) return false;
    if (selectedType !== 'all' && module.type !== selectedType) return false;
    if (selectedState !== 'all') {
      if (selectedState === 'in-progress' && module.status !== 'In Progress')
        return false;
      if (selectedState === 'completed' && module.status !== 'Completed')
        return false;
      if (selectedState === 'not-started' && !module.status) return false;
    }
    if (selectedStatus !== 'all' && module.status !== selectedStatus)
      return false;
    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredModules.length / MODULES_PER_PAGE)
  );
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * MODULES_PER_PAGE,
    currentPage * MODULES_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    selectedCategory,
    selectedDifficulty,
    selectedTier,
    selectedType,
    selectedState,
    selectedStatus,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Section the page's modules by category, keeping the order they first
  // appear so the list does not reshuffle between pages.
  const groupedModules = useMemo(() => {
    const groups = new Map<string, typeof paginatedModules>();
    for (const module of paginatedModules) {
      const key = module.category || 'OTHER';
      const bucket = groups.get(key);
      if (bucket) bucket.push(module);
      else groups.set(key, [module]);
    }
    return Array.from(groups.entries());
  }, [paginatedModules]);

  // Difficulty is ordinal, so brightness ranks it.
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

  const formatLabel = (value: string) =>
    value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const completedCount = modules.filter((module) => module.isCompleted).length;
  const inProgressCount = modules.filter(
    (module) => module.status === 'In Progress'
  ).length;
  const favouriteCount = modules.filter((module) => module.isFavourite).length;

  return (
    <div className="h-svh overflow-hidden bg-background">
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <AppTopBar
            crumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Learn' },
              { label: 'Modules' },
            ]}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1240px] p-5 md:px-10 md:py-8">
              <section>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h1 className="text-3xl tracking-tight text-foreground md:text-4xl">
                        {activeTab === 'all' ? 'Modules' : 'Favourites'}
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        학습 모듈 목록입니다. 진행 상태와 난이도로 걸러 볼 수
                        있습니다.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`h-9 rounded-full border px-4 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                          activeTab === 'all'
                            ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-foreground'
                            : 'border-[var(--warp-rule)] text-muted-foreground hover:border-[var(--warp-ash)]/40 hover:text-foreground'
                        }`}
                      >
                        All Modules
                      </button>
                      <button
                        onClick={() => setActiveTab('favourite')}
                        className={`h-9 rounded-full border px-4 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                          activeTab === 'favourite'
                            ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-foreground'
                            : 'border-[var(--warp-rule)] text-muted-foreground hover:border-[var(--warp-ash)]/40 hover:text-foreground'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          Favourite
                        </span>
                      </button>
                    </div>
                  </div>

                  <StatBar
                    stats={[
                      { label: 'Total', value: modules.length },
                      { label: 'Completed', value: completedCount },
                      { label: 'In progress', value: inProgressCount },
                      { label: 'Favourites', value: favouriteCount },
                    ]}
                  />
                </div>
              </section>

              <section className="border-b border-[var(--warp-rule)] py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[150px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                      <span>
                        {selectedCategory === 'all'
                          ? 'Category'
                          : formatLabel(selectedCategory)}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setSelectedCategory('all')}
                      >
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedCategory('GENERAL')}
                      >
                        General
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedCategory('OFFENSIVE')}
                      >
                        Offensive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedCategory('DEFENSIVE')}
                      >
                        Defensive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[150px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                      <span>
                        {selectedDifficulty === 'all'
                          ? 'Difficulty'
                          : selectedDifficulty}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setSelectedDifficulty('all')}
                      >
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedDifficulty('Fundamental')}
                      >
                        Fundamental
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedDifficulty('Easy')}
                      >
                        Easy
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedDifficulty('Medium')}
                      >
                        Medium
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedDifficulty('Hard')}
                      >
                        Hard
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                      <span>
                        {selectedTier === 'all' ? 'Tier' : selectedTier}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedTier('all')}>
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedTier('Tier 0')}
                      >
                        Tier 0
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedTier('Tier I')}
                      >
                        Tier I
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedTier('Tier II')}
                      >
                        Tier II
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                      <span>
                        {selectedType === 'all'
                          ? 'Type'
                          : formatLabel(selectedType)}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedType('all')}>
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedType('REGULAR')}
                      >
                        Regular
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedType('PREMIUM')}
                      >
                        Premium
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                      <span>
                        {selectedState === 'all'
                          ? 'State'
                          : formatLabel(selectedState)}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedState('all')}>
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedState('in-progress')}
                      >
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedState('completed')}
                      >
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedState('not-started')}
                      >
                        Not Started
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                      <span>
                        {selectedStatus === 'all' ? 'Status' : selectedStatus}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setSelectedStatus('all')}
                      >
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedStatus('In Progress')}
                      >
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedStatus('Completed')}
                      >
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedStatus('Not Started')}
                      >
                        Not Started
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-[170px] h-9 px-3 py-2 flex items-center justify-between rounded-md border border-[var(--warp-rule)] bg-[var(--warp-surface)] text-xs transition-colors hover:border-[var(--warp-ash)]/40">
                        <span>View: {formatLabel(viewBy)}</span>
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setViewBy('default')}>
                          Default
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewBy('grid')}>
                          Grid
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </section>

              {isLoading && (
                <div className="rounded-md border border-[var(--warp-rule)]  py-14 text-center">
                  <p className="text-sm text-muted-foreground">
                    Loading modules...
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-[var(--warp-rule)] py-14 text-center">
                  <p className="text-sm text-destructive">
                    모듈 목록을 불러오지 못했습니다
                  </p>
                </div>
              )}

              {!isLoading && !error && filteredModules.length === 0 && (
                <div className="rounded-md border border-[var(--warp-rule)]  py-14 text-center">
                  <p className="text-sm text-muted-foreground">
                    No modules found
                  </p>
                </div>
              )}

              {!isLoading && !error && filteredModules.length > 0 && (
                <>
                  {/* Grouped by category. The category was a badge on every
                      card; as a section heading it becomes structure instead,
                      and each row stops repeating it. */}
                  {groupedModules.map(([category, group]) => (
                    <section key={category} className="mt-8 first:mt-6">
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {formatLabel(category)}
                        </h2>
                        <span className="warp-num text-[11px] text-muted-foreground">
                          {group.length}
                        </span>
                        <span className="h-px flex-1 bg-[var(--warp-rule)]" />
                      </div>

                      <ul className="mt-2">
                        {group.map((module) => {
                          const progress = module.isCompleted
                            ? 100
                            : (module.progress ?? 0);
                          return (
                            <li key={module.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/learn/modules/${module.id}`)
                                }
                                className="flex w-full items-baseline gap-4 border-b border-[var(--warp-rule)] py-3 text-left transition-colors hover:bg-white/[0.03]"
                              >
                                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                  {module.title}
                                </span>
                                <span
                                  className={`hidden w-24 shrink-0 text-xs sm:inline ${getDifficultyColor(module.difficulty)}`}
                                >
                                  {module.difficulty}
                                </span>
                                <span className="warp-num hidden w-16 shrink-0 text-right text-xs text-muted-foreground md:inline">
                                  {module.duration || '—'}
                                </span>
                                {/* The meter doubles as the progress figure's
                                    label, so the row needs no "Progress" word. */}
                                <span className="hidden w-28 shrink-0 items-center gap-2 lg:flex">
                                  <span className="h-px flex-1 bg-[var(--warp-rule)]">
                                    <span
                                      className={`block h-px ${module.isCompleted ? 'bg-[var(--warp-parchment)]' : 'bg-[var(--warp-ash)]'}`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </span>
                                </span>
                                <span className="warp-num w-12 shrink-0 text-right text-xs text-foreground">
                                  {progress}%
                                </span>
                                <span className="w-4 shrink-0 text-center text-xs text-foreground">
                                  {module.isCompleted ? '✓' : ''}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="text-xs"
                      >
                        Prev
                      </Button>
                      <span className="warp-num text-xs text-muted-foreground px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
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

ModulesPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ModulesPage;
