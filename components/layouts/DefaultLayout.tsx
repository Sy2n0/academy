import React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface DefaultLayoutProps {
  children: React.ReactNode;
}

/**
 * HUB ACADEMY 기본 레이아웃 (AppSidebar + 본문).
 * BoxyHQ 스타일 Drawer/AccountLayout 대신 사용.
 */
export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <AnimatedNoise opacity={0.03} />
      <div className="relative z-10">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30">
              <div className="flex items-center gap-2 px-6 md:px-12">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto py-5">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
