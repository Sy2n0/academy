import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
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
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';

const AdminLearnPage: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Learn Management - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <div className="relative z-10">
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
                          Learn Management
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    LEARN MANAGEMENT
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Manage learning modules, tracks, and assignments
                  </p>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-3">
                  <Link
                    href="/admin/learn/modules"
                    className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/50 transition-colors block"
                  >
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      MODULES
                    </h3>
                    <div className="space-y-4">
                      <p className="font-mono text-sm text-muted-foreground">
                        Manage learning modules
                      </p>
                      <span className="font-mono text-xs uppercase tracking-wider text-foreground hover:text-accent transition-colors inline-block">
                        View Modules →
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/admin/learn/tracks"
                    className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/50 transition-colors block"
                  >
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      TRACKS
                    </h3>
                    <div className="space-y-4">
                      <p className="font-mono text-sm text-muted-foreground">
                        Manage learning tracks
                      </p>
                      <span className="font-mono text-xs uppercase tracking-wider text-foreground hover:text-accent transition-colors inline-block">
                        View Tracks →
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/admin/learn/attachments"
                    className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/50 transition-colors block"
                  >
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      ASSIGNMENTS
                    </h3>
                    <div className="space-y-4">
                      <p className="font-mono text-sm text-muted-foreground">
                        Manage assignments and who can submit
                      </p>
                      <span className="font-mono text-xs uppercase tracking-wider text-foreground hover:text-accent transition-colors inline-block">
                        View Assignments →
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
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
}

AdminLearnPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminLearnPage;
