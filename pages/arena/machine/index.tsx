import { type ReactElement, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

const getCategoryIcon = (category: string | undefined | null) => {
  if (!category) {
    return '';
  }
  
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('misc')) {
    return '';
  } else if (categoryLower.includes('crypto')) {
    return '';
  } else if (categoryLower.includes('pwn')) {
    return '';
  } else if (categoryLower.includes('web')) {
    return '';
  } else if (categoryLower.includes('revers') || categoryLower.includes('reverse')) {
    return '';
  } else if (categoryLower.includes('forensic')) {
    return '';
  } else if (categoryLower.includes('hardware')) {
    return '';
  } else if (categoryLower.includes('ppc') || categoryLower.includes('programming')) {
    return '';
  } else if (categoryLower.includes('pentest') || categoryLower.includes('network')) {
    return '';
  }
  return '';
};

const getCategoryColor = (category: string | undefined | null) => {
  if (!category) {
    return 'bg-accent';
  }
  
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('misc')) {
    return 'bg-green-500';
  } else if (categoryLower.includes('crypto')) {
    return 'bg-purple-500';
  } else if (categoryLower.includes('pwn')) {
    return 'bg-red-500';
  } else if (categoryLower.includes('web')) {
    return 'bg-blue-500';
  } else if (categoryLower.includes('revers') || categoryLower.includes('reverse')) {
    return 'bg-yellow-500';
  } else if (categoryLower.includes('forensic')) {
    return 'bg-purple-300';
  } else if (categoryLower.includes('hardware')) {
    return 'bg-white';
  }
  return 'bg-accent';
};

const MachinesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const [hideSolved, setHideSolved] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('challenges');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<MachinesResponse>(
    '/api/machines',
    fetcher
  );

  const machines = data?.data?.machines || [];
  const userStats = data?.data?.userStats || { totalScore: 0, solvedCount: 0 };
  
  // 디버깅: isSolved 값 확인
  if (machines.length > 0) {
    console.log('Machines data:', machines.map(m => ({ 
      name: m.name, 
      isSolved: m.isSolved,
      isSolvedType: typeof m.isSolved,
      fullMachine: m
    })));
    console.log('User stats:', userStats);
    console.log('Full API Response:', data);
  }
  
  // 카테고리별 그룹화 (difficulty를 category로 사용)
  const categories = ['All', ...Array.from(new Set(machines.map(m => m.difficulty).filter(Boolean)))];
  const categoryCounts = categories.reduce((acc, cat) => {
    if (cat === 'All') {
      acc[cat] = machines.length;
    } else {
      acc[cat] = machines.filter(m => m.difficulty === cat).length;
    }
    return acc;
  }, {} as Record<string, number>);

  // 필터링
  const filteredMachines = machines.filter(machine => {
    if (selectedCategory !== 'All' && machine.difficulty !== selectedCategory) {
      return false;
    }
    if (hideSolved && machine.solvedCount > 0) {
      return false;
    }
    return true;
  });

  return (
    <>
      <Head>
        <title>Machines::HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col">
              {/* Top Bar */}
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30 bg-background/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-6 h-full">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Machines
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  <div className="ml-auto flex items-center gap-1 bg-background/40 border border-border/30 rounded-lg p-1">
                    {/* <button
                      onClick={() => setActiveTab('challenges')}
                      className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all ${
                        activeTab === 'challenges'
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Challenges
                    </button> */}
                    {/* <button
                      onClick={() => setActiveTab('monitoring')}
                      className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all ${
                        activeTab === 'monitoring'
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Monitoring
                    </button> */}
                  </div>
                </div>
              </header>

              {/* Main Content Area */}
              <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-64 border-r border-border/30 bg-background/40 backdrop-blur-sm overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Hide Solved Toggle */}
                <div className="flex items-center justify-between">
                  <label htmlFor="hide-solved" className="font-mono text-xs text-foreground cursor-pointer">
                    Hide Solved
                  </label>
                  <Switch
                    id="hide-solved"
                    checked={hideSolved}
                    onCheckedChange={setHideSolved}
                  />
                </div>

                {/* Categories */}
                <div className="space-y-1">
                  {categories.map((category) => {
                    const count = categoryCounts[category] || 0;
                    const isSelected = selectedCategory === category;
                    
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition-all ${
                          isSelected
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{getCategoryIcon(category === 'All' ? 'misc' : category)}</span>
                          <span>{category || 'Unknown'}</span>
                        </div>
                        <span className="text-xs">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="text-center py-20">
                  <p className="font-mono text-sm text-muted-foreground">Loading challenges...</p>
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="font-mono text-sm text-destructive">문제를 불러오지 못했습니다</p>
                </div>
              ) : filteredMachines.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-mono text-sm text-muted-foreground">No challenges found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredMachines.map((machine) => {
                    const colorClass = getCategoryColor(machine.difficulty);
                    const isSolved = machine.isSolved === true;
                    
                    return (
                      <button
                        key={machine.id}
                        onClick={() => setSelectedMachineId(machine.id)}
                        className={`group relative border rounded-lg hover:border-accent/50 transition-all duration-200 overflow-hidden w-full text-left ${
                          isSolved 
                            ? 'border-green-500 bg-green-500/10' 
                            : 'border-border/30 bg-card'
                        }`}
                      >
                        <div className="p-4 flex flex-col h-full min-h-[140px]">
                          {/* Title with Solved Badge */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-mono text-base font-semibold text-foreground">
                              {machine.name || 'Untitled'}
                            </h3>
                            {isSolved && (
                              <span className="font-mono text-xs text-green-500 uppercase tracking-wider px-1.5 py-0.5 border border-green-500 rounded bg-green-500/20">
                                Solved
                              </span>
                            )}
                          </div>
                          
                          {/* Colored Line below Title */}
                          <div className={`h-0.5 w-full ${colorClass} mb-auto`}></div>
                          
                          {/* Bottom Section: Points and Solves */}
                          <div className="flex items-center justify-between mt-auto pt-3">
                            <span className="font-mono text-xs text-foreground">
                              {machine.points ?? 0} pts
                            </span>
                            <span className="font-mono text-xs text-foreground uppercase">
                              {machine.solvedCount ?? 0} SOLVES
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="w-80 border-l border-border/30 bg-background/40 backdrop-blur-sm overflow-y-auto p-4">
              <div className="space-y-6">
                {/* User Panel */}
                {session && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {session.user?.name?.[0]?.toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {session.user?.name || 'ADMIN'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats: Overall, Score, Solved */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-lg font-semibold text-foreground">
                          {machines.length > 0 ? Math.round((userStats.solvedCount / machines.length) * 100) : 0}%
                        </span>
                        <span className="font-mono text-xs text-muted-foreground mt-1">Overall</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-lg font-semibold text-foreground">
                          {userStats.totalScore}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground mt-1">Score</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-lg font-semibold text-foreground">
                          {userStats.solvedCount}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground mt-1">Solved</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-background/60 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: '1%' }}></div>
                    </div>
                  </div>
                )}

                {/* Activity Feed */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1 bg-background/60 border border-border/30 rounded-lg p-1">
                    <button className="flex-1 px-2 py-1 rounded-md font-mono text-xs bg-accent text-foreground">
                      All
                    </button>
                    <button className="flex-1 px-2 py-1 rounded-md font-mono text-xs text-muted-foreground hover:text-foreground">
                      Notice
                    </button>
                    <button className="flex-1 px-2 py-1 rounded-md font-mono text-xs text-muted-foreground hover:text-foreground">
                      News
                    </button>
                    <button className="flex-1 px-2 py-1 rounded-md font-mono text-xs text-muted-foreground hover:text-foreground">
                      Challenge
                    </button>
                  </div>
                  <div className="space-y-2">
                    {machines.slice(0, 4).map((machine) => (
                      <div key={machine.id} className="flex items-start gap-2">
                        <Plus className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-mono text-xs text-muted-foreground">
                            {new Date().toLocaleString('en-US', {
                              year: '2-digit',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })} New challenge [{machine.name}] has been released.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
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
