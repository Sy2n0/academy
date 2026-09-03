/* eslint-disable i18next/no-literal-string */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import type { UserRole } from '@prisma/client';
import { isAdmin } from '@/lib/user-roles';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const sections = [
  { href: '#platform', label: 'Platform' },
  { href: '#programs', label: 'Disciplines' },
  { href: '#contact', label: 'Contact' },
];

function initials(name?: string | null) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function WarpNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The nav is transparent over the hero and only picks up its rule + blur once
  // the canvas starts moving underneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const user = session?.user;
  const isAuthenticated = status === 'authenticated' && !!user;

  // Same lookup the sidebar menu makes, so an admin sees the same entry from
  // either place rather than having to reach the app first.
  const { data: userData } = useSWR<{ data: { role: UserRole } }>(
    isAuthenticated ? '/api/users/me' : null,
    fetcher
  );
  const isUserAdmin = userData?.data?.role
    ? isAdmin(userData.data.role)
    : false;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-[var(--warp-motion-standard)]',
        scrolled && 'border-b border-[var(--warp-rule)] backdrop-blur-md'
      )}
      style={
        scrolled ? { backgroundColor: 'rgba(19, 19, 17, 0.82)' } : undefined
      }
    >
      <div className="warp-container flex h-[72px] items-center justify-between gap-6">
        <Link
          href="/"
          className="warp-nav-text whitespace-nowrap tracking-[-0.01em] text-[var(--warp-parchment)]"
        >
          HUB ACADEMY
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {sections.map(({ href, label }) => (
            <a key={href} href={href} className="warp-nav-text warp-link">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-md p-0.5 outline-none ring-1 ring-transparent transition-colors hover:bg-[var(--warp-veil)] hover:ring-[var(--warp-rule)] focus-visible:ring-2 focus-visible:ring-[var(--warp-ash)] data-[state=open]:bg-[var(--warp-veil)] data-[state=open]:ring-[var(--warp-rule)]"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8 cursor-pointer rounded-md">
                    <AvatarImage
                      src={user?.image || undefined}
                      alt={user?.name || 'User'}
                    />
                    <AvatarFallback className="rounded-md bg-[var(--warp-earth)] text-xs text-[var(--warp-ash)]">
                      {initials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-52 rounded-md border-[var(--warp-rule)] bg-[var(--warp-surface)] p-0"
              >
                {/* Identity, stated once, with the same avatar size as the
                    trigger so opening the menu does not resize the face —
                    matching the sidebar menu inside the app. */}
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 border-b border-[var(--warp-rule)] px-2.5 py-2.5 text-left">
                    <Avatar className="h-7 w-7 rounded-md">
                      <AvatarImage
                        src={user?.image || undefined}
                        alt={user?.name || 'User'}
                      />
                      <AvatarFallback className="rounded-md bg-[var(--warp-earth)] text-xs text-[var(--warp-ash)]">
                        {initials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 leading-tight">
                      <span className="truncate text-[13px] font-medium text-[var(--warp-parchment)]">
                        {user?.name || 'User'}
                      </span>
                      <span className="truncate text-[11px] text-[var(--warp-stone)]">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuGroup className="p-1">
                  <DropdownMenuItem
                    className="py-1 text-[13px]"
                    onClick={() => router.push('/dashboard')}
                  >
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="py-1 text-[13px]"
                    onClick={() => router.push('/settings/account')}
                  >
                    Account
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                {isUserAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-[var(--warp-rule)]" />
                    <DropdownMenuGroup className="p-1">
                      <DropdownMenuLabel className="px-2 pb-0.5 pt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--warp-stone)]">
                        Admin
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="py-1 text-[13px]"
                        onClick={() => router.push('/admin/dashboard')}
                      >
                        Admin dashboard
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}

                {/* Signing out is not a destination, so it does not sit in the
                    same list as the two that are. */}
                <DropdownMenuSeparator className="bg-[var(--warp-rule)]" />
                <div className="p-1">
                  <DropdownMenuItem
                    className="py-1 text-[13px]"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Log out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="warp-ghost hidden sm:inline-flex"
              >
                Sign in
              </Link>
              <Link href="/auth/join" className="warp-pill">
                Get started
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-[var(--warp-ash)] md:hidden"
          >
            <span className="flex w-4 flex-col gap-[5px]">
              <span
                className={cn(
                  'block h-px w-full bg-current transition-transform duration-[var(--warp-motion-fast)]',
                  menuOpen && 'translate-y-[3px] rotate-45'
                )}
              />
              <span
                className={cn(
                  'block h-px w-full bg-current transition-transform duration-[var(--warp-motion-fast)]',
                  menuOpen && '-translate-y-[3px] -rotate-45'
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-[var(--warp-rule)] bg-[var(--warp-void)] md:hidden">
          <div className="warp-container flex flex-col py-4">
            {sections.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="warp-nav-text warp-link py-3"
              >
                {label}
              </a>
            ))}
            {!isAuthenticated && (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="warp-nav-text warp-link py-3 sm:hidden"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
