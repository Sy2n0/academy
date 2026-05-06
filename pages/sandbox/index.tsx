import { useEffect, useState } from 'react';
import { Hexagon } from './Hexagon';
import Head from 'next/head';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AnimatedNoise } from '@/components/animated-noise';
import { SessionProvider } from 'next-auth/react';

interface SandboxProblem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  positionX: number;
  positionY: number;
  orderIndex: number;
}

const HEX_SIZE = 120;

export default function SandboxPage() {
  const [problems, setProblems] = useState<SandboxProblem[]>([]);

  useEffect(() => {
    fetch('/api/sandbox/problems')
      .then((res) => res.json())
      .then((json) => json.data && setProblems(json.data))
      .catch(() => {});
  }, []);

  return (
    <SessionProvider>
      <Head>
        <title>SANDBOX - HUB ACADEMY</title>
      </Head>
      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <span className="font-mono text-xs">SANDBOX</span>
                </div>
              </header>
              <main className="flex-1 flex items-center justify-center min-h-[640px]">
                <div className="relative w-full max-w-5xl h-[640px] flex items-center justify-center">
                  {/* 배경 연결선: 중앙에서 바깥으로 (선택) */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 1024 640"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M512 320 Q 380 230, 260 160" stroke="#22c1c322" strokeWidth="2" strokeDasharray="4 8" />
                    <path d="M512 320 Q 360 370, 240 460" stroke="#22c1c322" strokeWidth="2" strokeDasharray="4 8" />
                    <path d="M512 320 Q 650 230, 780 150" stroke="#22c1c322" strokeWidth="2" strokeDasharray="4 8" />
                    <path d="M512 320 Q 660 390, 800 460" stroke="#22c1c322" strokeWidth="2" strokeDasharray="4 8" />
                  </svg>

                  {/* 중앙 로고 (육각형 + Linux Tux) */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                    <Hexagon
                      color="hsl(var(--sidebar-accent))"
                      size={96}
                      style={{ filter: 'none', boxShadow: 'none' }}
                      fillOpacity={0.98}
                    />
                    <img src="https://cdn.freebiesupply.com/logos/thumbs/2x/linux-tux-2-logo.png" alt="Linux Tux" className="absolute w-20 h-20 object-contain pointer-events-none" style={{ filter: 'none', boxShadow: 'none' }} />
                  </div>

                  {/* Admin에서 지정한 위치에 육각형 렌더 (겹침 없음) */}
                  {problems.map((p) => (
                    <div
                      key={p.id}
                      className="absolute z-10 transition-transform duration-200 hover:scale-110"
                      style={{
                        left: `${p.positionX * 100}%`,
                        top: `${p.positionY * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={p.title}
                    >
                      <Hexagon color={undefined} size={HEX_SIZE} fillOpacity={0.85} />
                    </div>
                  ))}
                </div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </SessionProvider>
  );
}
