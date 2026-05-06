import type { ReactElement } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import Head from 'next/head';

const PlaygroundMachinePage = () => {
  return (
    <>
      <Head>
        <title>Playground Machines::HUB ACADEMY</title>
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
                  <div className="flex items-center gap-6">
                    <h1 className="font-[var(--font-bebas)] text-2xl tracking-tight text-foreground" style={{ fontStyle: 'italic' }}>
                      Playground Machines
                    </h1>
                  </div>
                </div>
              </header>
              {/* Main Content Area */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar (예시) */}
                <div className="w-64 border-r border-border/30 bg-background/40 backdrop-blur-sm overflow-y-auto p-4">
                  <div className="space-y-6">
                    <div className="font-mono text-xs text-muted-foreground">카테고리/필터 영역</div>
                  </div>
                </div>
                {/* Center Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-center py-20">
                    <p className="font-mono text-lg text-foreground">여기에 플레이그라운드 머신 관련 내용을 추가하세요.</p>
                  </div>
                </div>
                {/* Right Sidebar (예시) */}
                <div className="w-80 border-l border-border/30 bg-background/40 backdrop-blur-sm overflow-y-auto p-4">
                  <div className="space-y-6">
                    <div className="font-mono text-xs text-muted-foreground">유저/피드 영역</div>
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

PlaygroundMachinePage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PlaygroundMachinePage;
