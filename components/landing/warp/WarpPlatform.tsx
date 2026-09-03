/* eslint-disable i18next/no-literal-string */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

import { SandboxTerminal, ModuleList, Leaderboard } from './WarpVisuals';
import type { LandingData } from '@/lib/landing';

export function WarpPlatform({ data }: { data: LandingData | null }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      sectionRef.current?.querySelectorAll('[data-block]').forEach((block) => {
        gsap.from(block, {
          y: 36,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: block, start: 'top 88%' },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const blocks = [
    {
      label: 'Sandbox · AttackBox',
      title: 'Disposable machines, one click away',
      body: '문제마다 격리된 컨테이너가 뜹니다. 브라우저 안에서 바로 셸을 잡고, 풀고, 버립니다. 설치할 것도 망가뜨릴 것도 없습니다.',
      points: [
        '브라우저 터미널 — 로컬 세팅 불필요',
        'Cloud IDE · AttackBox 세션 지원',
        data
          ? `${data.sandboxCategories.map((c) => c.category).join(' · ')}`
          : null,
      ],
      visual: <SandboxTerminal solves={data?.stats.sandboxSolves ?? 0} />,
    },
    {
      label: 'Learn',
      title: 'Modules that build to something',
      body: '리눅스 기초부터 티어별로 쌓입니다. 모듈은 스킬패스로 묶이고, 완료 기록이 그대로 점수와 배지로 이어집니다.',
      points: [
        data ? `${data.moduleCount}개 학습 모듈` : null,
        '스킬패스 · 티어 진행도 추적',
        '과제 제출 및 첨부파일',
      ],
      visual: data ? (
        <ModuleList modules={data.modules} total={data.moduleCount} />
      ) : null,
    },
    {
      label: 'Rankings',
      title: 'Every solve is on the board',
      body: '플래그, 샌드박스 풀이, 모듈 완료가 모두 점수 이력으로 남습니다. 시즌별·머신별 랭킹이 따로 집계됩니다.',
      points: [
        data ? `${data.stats.flagsCaptured}건의 정답 플래그 기록` : null,
        '플레이그라운드 · 머신 랭킹 분리',
        '점수 이력 · 배지 · 랭크',
      ],
      visual: data ? <Leaderboard ranks={data.ranks} /> : null,
    },
  ];

  return (
    <section
      id="platform"
      ref={sectionRef}
      className="warp-section warp-rule relative"
    >
      <div className="warp-container">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="warp-label">Platform</p>
            <h2 className="warp-heading mt-4">What you actually get</h2>
          </div>
          {/* <p className="warp-body max-w-[38ch] md:text-right">
            아래 화면은 목업이 아니라 지금 플랫폼에 들어 있는 실제 데이터입니다.
          </p> */}
        </div>

        <div className="mt-14 flex flex-col gap-16 md:gap-20">
          {blocks.map(({ label, title, body, points, visual }, i) => (
            <div
              key={label}
              data-block
              className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <div className={cn(i % 2 === 1 && 'lg:order-2')}>
                <p className="warp-label">{label}</p>
                <h3 className="warp-feature mt-4 max-w-[18ch]">{title}</h3>
                <p className="warp-body-lg mt-5 max-w-[46ch]">{body}</p>
                <ul className="mt-7 flex flex-col border-b border-[var(--warp-rule)]">
                  {points.filter(Boolean).map((point) => (
                    <li
                      key={point as string}
                      className="warp-body flex gap-3 border-t border-[var(--warp-rule)] py-3 text-[1rem]"
                    >
                      <span
                        aria-hidden="true"
                        className="warp-mono select-none text-[var(--warp-stone)]"
                      >
                        —
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cn(i % 2 === 1 && 'lg:order-1')}>{visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
