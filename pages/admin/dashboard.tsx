import { type ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
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
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import Link from 'next/link';
import { Server, BookOpen, Gamepad2, Users, Settings, BarChart3, Flag, FileText, Activity, Download, Plus, Paperclip, Sparkles, ArrowRight, Hexagon, Trash2 } from 'lucide-react';

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!isAdmin(user.role)) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CategorySection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: QuickAction[];
}

const AdminDashboard: NextPageWithLayout = () => {
  const { t } = useTranslation('common');

  const quickActions: QuickAction[] = [
    {
      id: 'create-machine',
      title: 'Create Machine',
      description: '새 실습 머신을 빠르게 생성합니다.',
      href: '/admin/machines/active/create',
      icon: Plus,
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      description: '제출/이벤트 상태를 실시간 확인합니다.',
      href: '/admin/monitoring',
      icon: Activity,
    },
    {
      id: 'export',
      title: 'Export',
      description: '랭킹·제출 데이터를 내보냅니다.',
      href: '/admin/export',
      icon: Download,
    },
  ];

  const categories: CategorySection[] = [
    {
      id: 'machines',
      title: 'MACHINES',
      description: '문제 머신 운영과 플래그 관리',
      icon: Server,
      items: [
        { id: 'machine-manage', title: 'Machine Manage', description: '머신 상태/정보를 관리합니다.', href: '/admin/machine-manage', icon: Server },
        { id: 'active-machines', title: 'Active Machines', description: '머신 목록 조회 및 삭제를 관리합니다.', href: '/admin/machines/active/manage', icon: Trash2 },
        { id: 'flags', title: 'Flags', description: '플래그 데이터를 점검합니다.', href: '/admin/machines/flags', icon: Flag },
      ],
    },
    {
      id: 'content',
      title: 'CONTENT',
      description: 'Playground·학습 콘텐츠 운영',
      icon: BookOpen,
      items: [
        { id: 'playground', title: 'Playground', description: '시즌/코드네임 설정을 관리합니다.', href: '/admin/playground', icon: Gamepad2 },
        { id: 'playground-challenges', title: 'PG Challenges', description: '문제 등록/수정/삭제를 관리합니다.', href: '/admin/playground/challenges', icon: Flag },
        { id: 'sandbox', title: 'SANDBOX', description: 'SANDBOX 문제를 등록하고 육각형 위치를 지정합니다.', href: '/admin/sandbox', icon: Hexagon },
        { id: 'learn', title: 'Learn', description: '학습 구조 전반을 관리합니다.', href: '/admin/learn', icon: BookOpen },
        { id: 'attachments', title: 'Attachments', description: '학습 첨부파일을 관리합니다.', href: '/admin/learn/attachments', icon: Paperclip },
      ],
    },
    {
      id: 'community',
      title: 'COMMUNITY',
      description: '사용자/팀/커뮤니티 콘텐츠 운영',
      icon: Users,
      items: [
        { id: 'teams', title: 'Teams', description: '팀 생성/멤버십을 관리합니다.', href: '/admin/teams', icon: Users },
        { id: 'writeups', title: 'Writeups', description: '작성물 검토 상태를 관리합니다.', href: '/admin/writeups', icon: FileText },
        { id: 'users', title: 'Users', description: '사용자 권한/상태를 관리합니다.', href: '/admin/users', icon: Users },
      ],
    },
    {
      id: 'system',
      title: 'SYSTEM',
      description: '운영 보조/배지/분석 도구',
      icon: Settings,
      items: [
        { id: 'monitoring', title: 'Monitoring', description: '실시간 운영 상태를 확인합니다.', href: '/admin/monitoring', icon: Activity },
        { id: 'export', title: 'Export', description: '운영 데이터를 내보냅니다.', href: '/admin/export', icon: Download },
        { id: 'badges', title: 'Badges', description: '배지 생성/매핑/할당을 관리합니다.', href: '/admin/badges', icon: Sparkles },
        { id: 'analytics', title: 'Analytics', description: '관리자 분석 페이지(준비 중).', href: '/admin/analytics', icon: BarChart3 },
      ],
    },
  ];

  const overviewCards = [
    { id: 'groups', label: 'Management Groups', value: categories.length, helper: '운영 섹션 수', icon: Settings },
    { id: 'actions', label: 'Quick Actions', value: quickActions.length, helper: '즉시 실행 도구', icon: Plus },
    {
      id: 'links',
      label: 'Admin Links',
      value: categories.reduce((sum, category) => sum + category.items.length, 0),
      helper: '접근 가능한 페이지',
      icon: ArrowRight,
    },
    { id: 'priority', label: 'Today Focus', value: 'LIVE', helper: 'Monitoring', icon: Activity },
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Admin Dashboard
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-4 md:py-6">
                  <div className="max-w-6xl mx-auto space-y-6">
                    <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5 md:p-6">
                      <h1 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground mb-1" style={{ fontStyle: 'italic' }}>
                        ADMIN DASHBOARD
                      </h1>
                      <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                        운영 작업을 빠르게 찾을 수 있도록 정리된 관리자 허브
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {overviewCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <div key={card.id} className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
                                <p className="font-mono text-xl text-foreground mt-1">{card.value}</p>
                                <p className="font-mono text-[10px] text-muted-foreground mt-1">{card.helper}</p>
                              </div>
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <Link
                            key={action.id}
                            href={action.href}
                            className="group border border-border/30 rounded-lg backdrop-blur-sm bg-card/50 hover:border-accent/50 hover:bg-background/60 transition-all duration-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-xs text-foreground uppercase tracking-wider">{action.title}</p>
                                <p className="font-mono text-[10px] text-muted-foreground mt-2">{action.description}</p>
                              </div>
                              <Icon className="h-4 w-4 text-foreground mt-0.5" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {categories.map((category) => {
                        const CategoryIcon = category.icon;
                        return (
                          <div key={category.id} className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h2 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                                  {category.title}
                                </h2>
                                <p className="font-mono text-[10px] text-muted-foreground mt-1">{category.description}</p>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground">{category.items.length} items</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {category.items.map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                  <Link
                                    key={item.id}
                                    href={item.href}
                                    className="group px-3 py-3 border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 hover:border-accent/50 hover:bg-background/60 transition-all duration-200"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="font-mono text-xs text-foreground uppercase tracking-wider truncate">{item.title}</p>
                                        <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate">{item.description}</p>
                                      </div>
                                      <ItemIcon className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

AdminDashboard.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminDashboard;
