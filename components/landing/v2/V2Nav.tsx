/* eslint-disable i18next/no-literal-string */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const links = [
  { href: '#platform', label: 'Platform' },
  { href: '#tracks', label: 'Tracks' },
  { href: '#contact', label: 'Contact' },
];

export function V2Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled && 'border-b border-[var(--v2-line)] backdrop-blur-xl'
      )}
      style={scrolled ? { backgroundColor: 'rgba(19,19,17,0.78)' } : undefined}
    >
      <div className="v2-container flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 whitespace-nowrap text-[0.9375rem] font-bold tracking-[-0.02em]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-white to-[#e7e5e0] text-[0.6875rem] font-bold text-[#131311]">
            H
          </span>
          HUB ACADEMY
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-[var(--v2-muted)] transition-colors hover:text-[var(--v2-text)]"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/auth/login"
            className="hidden text-sm font-semibold text-[var(--v2-muted)] transition-colors hover:text-[var(--v2-text)] sm:block"
          >
            Sign in
          </Link>
          <Link href="/auth/join" className="v2-btn h-9 px-4 text-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
