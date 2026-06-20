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
  BreadcrumbLink,
  BreadcrumbSeparator,
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
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Download, FileSpreadsheet, Database } from 'lucide-react';

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

const Export: NextPageWithLayout = () => {
  const { t } = useTranslation('common');

  const handleExportRankings = async () => {
    try {
      const response = await fetch('/api/admin/rankings/export');
      if (!response.ok) throw new Error('랭킹 내보내기에 실패했습니다');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rankings-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Rankings exported successfully');
    } catch (error: any) {
      toast.error(error.message || '랭킹 내보내기에 실패했습니다');
    }
  };

  const handleExportSubmissions = async () => {
    try {
      const response = await fetch('/api/admin/submissions/export');
      if (!response.ok) throw new Error('제출 내보내기에 실패했습니다');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Submissions exported successfully');
    } catch (error: any) {
      toast.error(error.message || '제출 내보내기에 실패했습니다');
    }
  };

  return (
    <>
      <Head>
        <title>Export Data - Admin - HUB ACADEMY</title>
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
                        <BreadcrumbLink
                          href="/admin/dashboard"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Admin
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Export Data
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-6">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                      <h1
                        className="font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight text-foreground mb-2"
                        style={{ fontStyle: 'italic' }}
                      >
                        EXPORT DATA
                      </h1>
                      <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                        Export Rankings and Submission History
                      </p>
                    </div>

                    {/* Export Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <FileSpreadsheet className="h-6 w-6 text-accent" />
                          <h2 className="font-mono text-base font-semibold text-foreground uppercase tracking-wider">
                            Rankings Export
                          </h2>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mb-4">
                          Export current rankings with user points, ranks, and
                          score breakdowns.
                        </p>
                        <Button
                          onClick={handleExportRankings}
                          className="w-full font-mono text-xs uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Rankings (CSV)
                        </Button>
                      </div>

                      <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Database className="h-6 w-6 text-accent" />
                          <h2 className="font-mono text-base font-semibold text-foreground uppercase tracking-wider">
                            Submissions Export
                          </h2>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mb-4">
                          Export all flag submission history with timestamps,
                          scores, and status.
                        </p>
                        <Button
                          onClick={handleExportSubmissions}
                          className="w-full font-mono text-xs uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Submissions (CSV)
                        </Button>
                      </div>
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

Export.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Export;
