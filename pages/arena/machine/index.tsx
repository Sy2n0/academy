import { type ReactElement, useMemo, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Head from 'next/head';
import { Switch } from '@/components/ui/switch';
import useSWR from 'swr';
import { MachineDetailModal } from '@/components/machines/MachineDetailModal';

interface Machine {
  id: string;
  name: string;
  difficulty: string;
  type?: string;
  points: number;
  solvedCount: number;
  isActive?: boolean;
  isSolved?: boolean;
}

interface MachinesResponse {
  data: {
    machines: Machine[];
    userStats?: {
      totalScore: number;
      solvedCount: number;
    };
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include', // 쿠키 포함
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  const data = await res.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
  return data;
};

const MachinesPage: NextPageWithLayout = () => {
  const [hideSolved, setHideSolved] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    null
  );

  const { data, error, isLoading } = useSWR<MachinesResponse>(
    '/api/machines',
    fetcher
  );

  const machines = data?.data?.machines || [];
  const userStats = data?.data?.userStats || { totalScore: 0, solvedCount: 0 };

  // 디버깅: isSolved 값 확인
  if (machines.length > 0) {
    console.log(
      'Machines data:',
      machines.map((m) => ({
        name: m.name,
        isSolved: m.isSolved,
        isSolvedType: typeof m.isSolved,
        fullMachine: m,
      }))
    );
    console.log('User stats:', userStats);
    console.log('Full API Response:', data);
  }

  // 카테고리별 그룹화 (difficulty를 category로 사용)
  const categories = [
    'All',
    ...Array.from(new Set(machines.map((m) => m.difficulty).filter(Boolean))),
  ];
  const categoryCounts = categories.reduce(
    (acc, cat) => {
      if (cat === 'All') {
        acc[cat] = machines.length;
      } else {
        acc[cat] = machines.filter((m) => m.difficulty === cat).length;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // 필터링
  const filteredMachines = machines.filter((machine) => {
    if (selectedCategory !== 'All' && machine.difficulty !== selectedCategory) {
      return false;
    }
    // isSolved is this viewer; solvedCount is everybody, so the old check hid
    // every machine anyone had ever solved.
    if (hideSolved && machine.isSolved) {
      return false;
    }
    return true;
  });

  // Group the filtered list by category for the board's sections, preserving
  // the order categories first appear so the board does not reshuffle.
  const boardGroups = useMemo(() => {
    const groups = new Map<string, Machine[]>();
    for (const machine of filteredMachines) {
      const key = machine.difficulty || 'Uncategorised';
      const bucket = groups.get(key);
      if (bucket) bucket.push(machine);
      else groups.set(key, [machine]);
    }
    return Array.from(groups.entries());
  }, [filteredMachines]);

  return (
    <>
      <Head>
        <title>Machines::HUB ACADEMY</title>
      </Head>

      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
            {/* Top Bar */}
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Machines' },
              ]}
            />

            {/* Challenge board. One full-width surface grouped by category —
                the list is the page, so it gets the whole width instead of
                sharing it with panels that had nothing to show. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1240px] p-5 md:px-10 md:py-8">
                {/* Board summary: what there is and how far you are. */}
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>
                    <span className="warp-num text-foreground">
                      {machines.length}
                    </span>{' '}
                    machines
                  </span>
                  <span>
                    <span className="warp-num text-foreground">
                      {userStats.solvedCount}
                    </span>{' '}
                    solved
                  </span>
                  <span>
                    <span className="warp-num text-foreground">
                      {userStats.totalScore}
                    </span>{' '}
                    pts earned
                  </span>
                </div>

                {/* Filter chips, inline. The category list was a 256px column
                    for what amounts to a handful of words. */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-[var(--warp-rule)] py-3">
                  {categories.map((category) => {
                    const count = categoryCounts[category] || 0;
                    const isSelected = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                          isSelected
                            ? 'border-[var(--warp-parchment)]/60 bg-[var(--warp-parchment)]/10 text-foreground'
                            : 'border-[var(--warp-rule)] text-muted-foreground hover:border-[var(--warp-ash)]/40 hover:text-foreground'
                        }`}
                      >
                        {category || 'Unknown'}{' '}
                        <span className="warp-num">{count}</span>
                      </button>
                    );
                  })}
                  <label
                    htmlFor="hide-solved"
                    className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    Hide solved
                    <Switch
                      id="hide-solved"
                      checked={hideSolved}
                      onCheckedChange={setHideSolved}
                    />
                  </label>
                </div>

                {isLoading ? (
                  <p className="py-20 text-center text-sm text-muted-foreground">
                    Loading challenges...
                  </p>
                ) : error ? (
                  <p className="py-20 text-center text-sm text-destructive">
                    문제를 불러오지 못했습니다
                  </p>
                ) : filteredMachines.length === 0 ? (
                  <p className="py-20 text-center text-sm text-muted-foreground">
                    No challenges found
                  </p>
                ) : (
                  boardGroups.map(([category, group]) => (
                    <section key={category} className="mt-10">
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {category || 'Uncategorised'}
                        </h2>
                        <span className="warp-num text-[11px] text-muted-foreground">
                          {group.length}
                        </span>
                        <span className="h-px flex-1 bg-[var(--warp-rule)]" />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {group.map((machine) => {
                          const isSolved = machine.isSolved === true;
                          return (
                            <button
                              key={machine.id}
                              onClick={() => setSelectedMachineId(machine.id)}
                              className={`group flex min-h-[104px] w-full flex-col rounded-md border p-4 text-left transition-colors ${
                                isSolved
                                  ? 'border-[var(--warp-ash)]/50 bg-[var(--warp-veil)]'
                                  : 'border-[var(--warp-rule)] hover:border-[var(--warp-ash)]/40 hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="min-w-0 text-sm font-medium leading-snug text-foreground">
                                  {machine.name || 'Untitled'}
                                </h3>
                                {isSolved && (
                                  <span
                                    aria-label="Solved"
                                    className="shrink-0 text-xs text-foreground"
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                              <div className="mt-auto flex items-baseline justify-between pt-4">
                                <span className="warp-num text-lg font-medium text-foreground">
                                  {machine.points ?? 0}
                                </span>
                                <span className="warp-num text-[11px] text-muted-foreground">
                                  {machine.solvedCount ?? 0} solves
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Machine Detail Modal */}
      <MachineDetailModal
        machineId={selectedMachineId}
        open={!!selectedMachineId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMachineId(null);
          }
        }}
      />
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

MachinesPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default MachinesPage;
