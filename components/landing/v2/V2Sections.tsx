/* eslint-disable i18next/no-literal-string */
import Link from 'next/link';
import {
  ArrowRight,
  Binary,
  Boxes,
  Bug,
  FileSearch,
  Globe,
  KeyRound,
  ListChecks,
  Code2,
  Trophy,
  Terminal,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LandingData } from '@/lib/landing';

/* ------------------------------------------------------------------ stats -- */

export function V2Stats({ data }: { data: LandingData | null }) {
  const tiles = [
    { value: data?.stats.flagsCaptured, label: '정답 플래그' },
    { value: data?.stats.sandboxSolves, label: '샌드박스 풀이' },
    { value: data?.stats.challengesLive, label: '활성 문제' },
    { value: data?.stats.members, label: '활동 부원' },
  ];

  return (
    <section className="border-y border-[var(--v2-line)] bg-[var(--v2-surface)]/50">
      <div className="v2-container grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4 md:py-12">
        {tiles.map(({ value, label }) => (
          <div key={label} className="text-center md:text-left">
            <div className="v2-mono text-[clamp(2rem,3.2vw,2.75rem)] font-bold leading-none">
              {value?.toLocaleString() ?? '—'}
            </div>
            <div className="v2-body mt-2 text-[0.8125rem] font-medium">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- features -- */

export function V2Features({ data }: { data: LandingData | null }) {
  const features = [
    {
      icon: Boxes,
      title: '격리된 실습 컨테이너',
      body: '문제마다 전용 컨테이너가 브라우저 안에서 바로 뜹니다. 로컬에 설치할 것도, 망가뜨릴 것도 없습니다.',
      meta: `${data?.stats.sandboxSolves ?? 0}건의 풀이 기록`,
      wide: true,
    },
    {
      icon: ListChecks,
      title: '티어별 학습 모듈',
      body: '리눅스 기초부터 순서대로 쌓입니다. 스킬패스가 경로를 잡아주고 완료 기록이 그대로 점수로 이어집니다.',
      meta: `${data?.moduleCount ?? 0}개 모듈`,
    },
    {
      icon: Trophy,
      title: '자동 채점과 랭킹',
      body: '플래그를 제출하면 즉시 채점되고 점수·랭킹·배지가 자동으로 갱신됩니다.',
      meta: `${data?.stats.flagsCaptured ?? 0}건 정답 처리`,
    },
    {
      icon: Terminal,
      title: 'AttackBox · Cloud IDE',
      body: '실습용 공격 머신과 웹 IDE 세션을 그대로 붙여서 씁니다.',
      meta: '세션 기반 제공',
    },
    {
      icon: Users,
      title: '팀과 시즌 운영',
      body: '부원을 팀으로 묶고 시즌 단위로 문제를 열고 닫습니다. 진행도는 팀별로 함께 집계됩니다.',
      meta: `${data?.stats.members ?? 0}명 · 시즌 운영`,
    },
  ];

  return (
    <section id="platform" className="v2-section relative overflow-hidden">
      <div
        className="v2-glow left-[-10rem] top-[6rem] h-[26rem] w-[26rem]"
        style={{ background: 'var(--v2-accent)', opacity: 0.05 }}
      />
      <div className="v2-container relative">
        <span className="v2-eyebrow">
          <span className="h-px w-6 bg-[var(--v2-accent)]" />
          Platform
        </span>
        <h2 className="v2-h2 mt-4 max-w-[18ch]">
          동아리 하나를 굴리는 데 필요한 전부
        </h2>
        <p className="v2-lead mt-4 max-w-[52ch]">
          아래 숫자는 예시가 아니라 지금 플랫폼에 들어 있는 실제 데이터입니다.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map(({ icon: Icon, title, body, meta, wide }) => (
            <article
              key={title}
              className={cn('v2-card p-6 md:p-7', wide && 'md:col-span-2')}
            >
              <span className="v2-icon-tile">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="v2-h3 mt-5">{title}</h3>
              <p className="v2-body mt-2.5 max-w-[52ch]">{body}</p>
              <p className="v2-mono mt-5 text-[0.75rem] font-semibold text-[var(--v2-accent)]">
                {meta}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- tracks -- */

const trackMeta: Record<
  string,
  { title: string; icon: typeof Bug; blurb: string }
> = {
  pwn: {
    title: 'Binary Exploitation',
    icon: Bug,
    blurb: '메모리 취약점으로 실행 흐름을 제어합니다.',
  },
  reversing: {
    title: 'Reverse Engineering',
    icon: Binary,
    blurb: '완성된 바이너리에서 설계와 로직을 되짚습니다.',
  },
  web: {
    title: 'Web Exploitation',
    icon: Globe,
    blurb: '웹 로직과 보안 결함을 공략합니다.',
  },
  crypto: {
    title: 'Cryptography',
    icon: KeyRound,
    blurb: '암호 체계를 설계하고 또 깨뜨립니다.',
  },
  forensics: {
    title: 'Digital Forensics',
    icon: FileSearch,
    blurb: '남은 흔적을 수집·복구해 증거로 만듭니다.',
  },
  programming: {
    title: 'Programming',
    icon: Code2,
    blurb: '문제를 코드로 푸는 힘을 기릅니다.',
  },
};

export function V2Tracks({ data }: { data: LandingData | null }) {
  const rows = (data?.categories ?? []).filter(
    (row) => trackMeta[row.category]
  );

  return (
    <section
      id="tracks"
      className="v2-section border-t border-[var(--v2-line)] bg-[var(--v2-surface)]/40"
    >
      <div className="v2-container">
        <span className="v2-eyebrow">
          <span className="h-px w-6 bg-[var(--v2-accent)]" />
          Tracks
        </span>
        <h2 className="v2-h2 mt-4">여섯 개 분야, 하나의 플랫폼</h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ category, count, points }) => {
            const meta = trackMeta[category];
            const Icon = meta.icon;
            return (
              <article
                key={category}
                className="v2-card group p-6 transition-colors duration-200 hover:border-[var(--v2-accent-line)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="v2-icon-tile">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="v2-mono text-[0.75rem] text-[var(--v2-dim)]">
                    {category}
                  </span>
                </div>

                <h3 className="v2-h3 mt-5">{meta.title}</h3>
                <p className="v2-body mt-2">{meta.blurb}</p>

                <div className="mt-6 flex items-center gap-5 border-t border-[var(--v2-line)] pt-4">
                  <span className="v2-mono text-[0.8125rem] font-semibold">
                    {count}
                    <span className="v2-body ml-1.5 text-[0.75rem] font-normal">
                      문제
                    </span>
                  </span>
                  <span className="v2-mono text-[0.8125rem] font-semibold">
                    {points}
                    <span className="v2-body ml-1.5 text-[0.75rem] font-normal">
                      점
                    </span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- cta -- */

export function V2Cta({ data }: { data: LandingData | null }) {
  return (
    <section className="v2-section relative overflow-hidden border-t border-[var(--v2-line)]">
      <div
        className="v2-glow left-1/2 top-1/2 h-[22rem] w-[40rem] -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'var(--v2-accent)', opacity: 0.07 }}
      />
      <div className="v2-container relative text-center">
        <h2 className="v2-h2 mx-auto max-w-[16ch]">
          <span className="v2-gradient-text">지금 첫 문제를 열어보세요</span>
        </h2>
        <p className="v2-lead mx-auto mt-5 max-w-[44ch]">
          계정을 만들면 {data?.stats.challengesLive ?? 0}개의 활성 문제와 학습
          모듈이 바로 열립니다.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/join" className="v2-btn">
            계정 만들기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/auth/login" className="v2-btn-ghost">
            로그인
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- footer -- */

export function V2Footer() {
  const columns = [
    {
      heading: 'Contents',
      items: [{ label: 'Recruiting CTF' }, { label: 'HUB Conference' }],
    },
    {
      heading: 'Location',
      items: [{ label: 'Cheonan, Korea' }, { label: 'Baekseok University' }],
    },
    {
      heading: 'Contact',
      items: [
        { label: 'Email', href: 'mailto:info@hub-h4ck.com' },
        { label: 'Instagram', href: 'https://www.instagram.com/hubxbu' },
      ],
    },
    {
      heading: 'Established',
      items: [{ label: '2026' }, { label: 'HUB ACADEMY' }],
    },
  ];

  return (
    <footer
      id="contact"
      className="border-t border-[var(--v2-line)] bg-[var(--v2-surface)]/50"
    >
      <div className="v2-container py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {columns.map(({ heading, items }) => (
            <div key={heading}>
              <h3 className="text-[0.8125rem] font-semibold">{heading}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {items.map(({ label, ...rest }) => (
                  <li key={label} className="v2-body text-[0.875rem]">
                    {'href' in rest && rest.href ? (
                      <a
                        href={rest.href}
                        className="transition-colors hover:text-[var(--v2-accent)]"
                        {...(rest.href.startsWith('http')
                          ? { target: '_blank', rel: 'noreferrer' }
                          : {})}
                      >
                        {label}
                      </a>
                    ) : (
                      label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="v2-body mt-12 border-t border-[var(--v2-line)] pt-6 text-[0.8125rem]">
          © 2026 Highest Unique Batch. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
