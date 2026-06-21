import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { type ReactElement } from 'react';
import Head from 'next/head';
import type { NextPageWithLayout } from 'types';

import env from '@/lib/env';
import { UpdatePassword } from '@/components/account';
import ManageSessions from '@/components/account/ManageSessions';
import { AnimatedNoise } from '@/components/animated-noise';
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

type SecurityProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Security: NextPageWithLayout<SecurityProps> = ({ sessionStrategy }) => {
  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

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
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Security
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    SECURITY
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Manage your password and active sessions
                  </p>
                </div>

                <div className="flex flex-col gap-8">
                  <UpdatePassword />
                  {sessionStrategy === 'database' && <ManageSessions />}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </>
  );
};

Security.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  const { sessionStrategy } = env.nextAuth;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      sessionStrategy,
    },
  };
};

export default Security;
