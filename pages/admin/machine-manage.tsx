import { type ReactElement, useState, useEffect } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { InformationTab } from '@/components/admin/machines/InformationTab';
import { MachinesTab } from '@/components/admin/machines/MachinesTab';
import { WriteupsTab } from '@/components/admin/machines/WriteupsTab';

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

const MachineManage: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('information');

  // gameId는 기본값으로 '1'을 사용하거나 실제 게임 ID를 가져와야 함
  const gameId = '1';

  return (
    <>
      <Head>
        <title>Machine Manage - Admin - HUB ACADEMY</title>
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
                          Machine Manage
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-6">
                  <div className="max-w-7xl mx-auto">
                    {/* Tabs Navigation */}
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-background/40 border border-border/30 p-1 gap-0 w-auto">
                        <TabsTrigger
                          value="information"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                        >
                          Information
                        </TabsTrigger>
                        <TabsTrigger
                          value="machines"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                        >
                          Machines
                        </TabsTrigger>
                        <TabsTrigger
                          value="writeups"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                        >
                          Writeups
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="information" className="mt-6">
                        <InformationTab gameId={gameId} />
                      </TabsContent>

                      <TabsContent value="machines" className="mt-6">
                        <MachinesTab gameId={gameId} />
                      </TabsContent>

                      <TabsContent value="writeups" className="mt-6">
                        <WriteupsTab gameId={gameId} />
                      </TabsContent>
                    </Tabs>
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

MachineManage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default MachineManage;
