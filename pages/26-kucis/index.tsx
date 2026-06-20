import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import Head from 'next/head';
import {
  Bug,
  Container,
  ExternalLink,
  GalleryVerticalEnd,
  Satellite,
} from 'lucide-react';
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
import { AnimatedNoise } from '@/components/animated-noise';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

const quickLinks = [
  {
    title: 'DASHBOARD',
    description: 'Program-wide metrics and team activity.',
    href: '/26-kucis/dashboard',
    icon: GalleryVerticalEnd,
  },
  {
    title: 'IMAGES',
    description: 'Registered machine images available to participants.',
    href: '/26-kucis/images',
    icon: Container,
  },
  {
    title: 'REPORTS',
    description: 'Vulnerability reports submitted by teams.',
    href: '/26-kucis/reports',
    icon: Bug,
  },
];

const teams = [
  { name: 'Jiyong Yang', school: 'BAEKSEOK UNIV.' },
  { name: 'Suan Jang', school: 'BAEKSEOK UNIV.' },
  // { name: 'DELTA-V', school: 'SEOUL NATIONAL UNIV.' },
  // { name: 'APOGEE', school: 'POSTECH' },
];

const targets = [
  {
    name: 'cFS',
    repo: 'nasa/cfs',
    href: 'https://github.com/nasa/cfs',
    detail:
      'Core Flight System — reusable flight software architecture for spacecraft.',
  },
  {
    name: 'CF',
    repo: 'nasa/CF',
    href: 'https://github.com/nasa/CF',
    detail: 'CCSDS File Delivery Protocol (CFDP) application for cFS.',
  },
  {
    name: 'CryptoLib',
    repo: 'nasa/CryptoLib',
    href: 'https://github.com/nasa/CryptoLib',
    detail: 'Space Data Link Security cryptographic library (SDLS / SDLS-EP).',
  },
  {
    name: 'SBN',
    repo: 'nasa/SBN',
    href: 'https://github.com/nasa/SBN',
    detail: 'Software Bus Network — inter-processor messaging for cFS.',
  },
];

const KucisProject: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>2026 KUCIS — HUB ACADEMY</title>
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
                          2026 KUCIS / Project
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-8 p-6 md:p-12 pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Satellite className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      PROJECT / 2026
                    </span>
                  </div>
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    2026 KUCIS
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground max-w-2xl">
                    Project Name : cFS 기반 위성 시스템 취약점 분석 및 보안 강화
                    프레임워크 연구
                  </p>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-3">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.title}
                        href="#"
                        className="group rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6 transition-colors hover:border-border/60 hover:bg-card/70"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-mono text-xs uppercase tracking-wider text-foreground">
                            {link.title}
                          </h3>
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                          {link.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <div className="flex items-baseline justify-between mb-4">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-foreground">
                        TEAMS
                      </h3>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {teams.length} REGISTERED
                      </span>
                    </div>
                    <div className="space-y-2">
                      {teams.map((team) => (
                        <div
                          key={team.name}
                          className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0"
                        >
                          <div className="w-28 shrink-0">
                            <p className="font-[var(--font-bebas)] text-lg tracking-tight text-foreground leading-none">
                              {team.name}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                              {team.school}
                            </p>
                          </div>
                          <div className="flex-1" />
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border/40 rounded-sm px-2 py-0.5">
                            26 KUCIS TEAM
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4">
                      TARGETS
                    </h3>
                    <div className="space-y-2">
                      {targets.map((item) => (
                        <a
                          key={item.repo}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-4 py-2 border-b border-border/30 last:border-0 hover:bg-accent/30 rounded-sm px-2 -mx-2 transition-colors"
                        >
                          <div className="w-28 shrink-0">
                            <p className="font-[var(--font-bebas)] text-lg tracking-tight text-foreground leading-none">
                              {item.name}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                              {item.repo}
                            </p>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground leading-relaxed flex-1">
                            {item.detail}
                          </p>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors self-start mt-1" />
                        </a>
                      ))}
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

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

KucisProject.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default KucisProject;
