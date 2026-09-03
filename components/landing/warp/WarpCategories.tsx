/* eslint-disable i18next/no-literal-string */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';
import type { LandingCategory } from '@/lib/landing';

gsap.registerPlugin(ScrollTrigger);

// The six disciplines, each keyed to the category string the playground actually
// stores — so every card can carry its real challenge count and point total.
const categories = [
  {
    key: 'pwn',
    title: 'Binary Exploitation',
    medium: 'Cyber Security',
    description:
      '프로그램의 메모리 구조 취약점을 이용하여 실행 흐름을 제어하거나 권한을 획득하는 기술입니다.',
    span: 'md:col-span-2 md:row-span-2',
    lead: true,
    tall: true,
  },
  {
    key: 'reversing',
    title: 'Reverse Engineering',
    medium: 'Software Engineering',
    description:
      '완성된 소프트웨어의 구조를 분석하여 설계 원리와 소스 코드를 역으로 추적하는 기술입니다.',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    key: 'web',
    title: 'Web Exploitation',
    medium: 'Web Security',
    description:
      '웹 애플리케이션의 로직이나 보안 취약점을 공략하여 데이터 탈취 및 시스템 제어를 수행하는 기술입니다.',
    span: 'md:col-span-1 md:row-span-2',
    tall: true,
  },
  {
    key: 'crypto',
    title: 'Cryptography',
    medium: 'Applied Mathematics',
    description:
      '정보의 기밀성을 유지하기 위해 데이터를 암호화하거나, 암호화된 체계를 분석 및 해독하는 기술입니다.',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    key: 'forensics',
    title: 'Digital Forensics',
    medium: 'Cyber Investigation',
    description:
      '디지털 기기에 남은 흔적을 수집, 복구, 분석하여 사건의 경위를 법적 증거로 증명하는 기술입니다.',
    span: 'md:col-span-2 md:row-span-1',
  },
  {
    key: 'programming',
    title: 'Programming Languages',
    medium: 'Computer Science',
    description:
      '컴퓨터와 소통하기 위한 언어의 설계 원리와 문법을 이해하고, 효율적인 코드를 작성하는 학문입니다.',
    span: 'md:col-span-1 md:row-span-1',
  },
];

export function WarpCategories({ stats }: { stats: LandingCategory[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const byKey = new Map(stats.map((row) => [row.category, row]));

  useEffect(() => {
    if (!sectionRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: 28,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 88%' },
      });

      const cards = gridRef.current?.querySelectorAll('article');
      if (cards?.length) {
        gsap.from(cards, {
          y: 36,
          opacity: 0,
          duration: 0.7,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: gridRef.current, start: 'top 88%' },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="programs" ref={sectionRef} className="warp-section warp-rule">
      <div className="warp-container">
        <div
          ref={headerRef}
          className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="warp-label">Disciplines</p>
            <h2 className="warp-heading mt-4">Six tracks, one platform</h2>
          </div>
          <p className="warp-body max-w-[38ch] md:text-right">
            HUB 동아리 내에서 학습을 진행하고 있는 분야들입니다.
          </p>
        </div>

        <div
          ref={gridRef}
          className="mt-12 grid auto-rows-[minmax(210px,auto)] grid-cols-1 gap-4 md:grid-cols-4 md:gap-5"
        >
          {categories.map(
            ({ key, title, medium, description, span, lead, tall }) => {
              const stat = byKey.get(key);
              return (
                <article
                  key={key}
                  className={cn(
                    'warp-card group flex flex-col justify-between p-6 transition-colors duration-[var(--warp-motion-standard)] hover:border-[rgb(226_226_226/55%)]',
                    span
                  )}
                >
                  <div>
                    <span className="warp-label">{medium}</span>
                    <h3
                      className={cn(
                        'mt-4',
                        lead ? 'warp-feature' : 'warp-card-title'
                      )}
                    >
                      {title}
                    </h3>
                    <p
                      className={cn(
                        'warp-body mt-4 max-w-[46ch] leading-[1.55]',
                        lead ? 'text-[1.0625rem]' : 'text-[0.9375rem]'
                      )}
                    >
                      {description}
                    </p>

                    {/* Tall cards would otherwise be mostly void — fill them with
                      what is actually in the track right now. */}
                    {tall && stat?.samples.length ? (
                      <ul className="mt-6 flex flex-col border-t border-[var(--warp-rule)]">
                        {stat.samples.map((sample) => (
                          <li
                            key={sample.title}
                            className="flex items-center justify-between gap-3 border-b border-[var(--warp-rule)] py-2.5"
                          >
                            <span className="truncate text-[0.875rem] text-[var(--warp-ash)]">
                              {sample.title}
                            </span>
                            <span className="warp-mono shrink-0 text-[0.8125rem] tabular-nums text-[var(--warp-stone)]">
                              {sample.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {/* Real counts, so each track reads as stocked rather than
                    aspirational. */}
                  <dl className="mt-6 flex items-center gap-6 border-t border-[var(--warp-rule)] pt-4">
                    <div className="flex items-baseline gap-2">
                      <dd className="warp-mono text-[0.9375rem] tabular-nums text-[var(--warp-parchment)]">
                        {stat?.count ?? '—'}
                      </dd>
                      <dt className="warp-micro">challenges</dt>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dd className="warp-mono text-[0.9375rem] tabular-nums text-[var(--warp-parchment)]">
                        {stat?.points ?? '—'}
                      </dd>
                      <dt className="warp-micro">points</dt>
                    </div>
                  </dl>
                </article>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}
