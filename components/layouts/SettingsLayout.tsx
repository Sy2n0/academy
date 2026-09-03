import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * The frame every Settings page shares.
 *
 * The four pages each carried their own shell and their own giant title, so
 * moving between them meant going back out to the app sidebar — there was no
 * way to tell they were one group. A left rail names the group and makes the
 * siblings reachable; the crumb trail and the page frame stop being copied.
 */
const SECTIONS = [
  // { href: '/settings', label: 'Overview' },
  { href: '/settings/account', label: 'Account' },
  { href: '/settings/security', label: 'Security' },
  { href: '/settings/api-keys', label: 'API Keys' },
  // { href: '/settings/badges', label: 'Badges' },
] as const;

export function SettingsLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="h-svh overflow-hidden bg-background">
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <AppTopBar
            crumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Settings', href: '/settings' },
              ...(router.pathname === '/settings'
                ? []
                : [{ label: title } as const]),
            ]}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1040px] p-5 md:px-10 md:py-8">
              <div className="grid gap-8 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-10">
                {/* Rail. Horizontal on narrow screens, where a 160px column
                    would take a third of the width. */}
                <nav className="flex gap-1 overflow-x-auto border-b border-[var(--warp-rule)] pb-3 md:flex-col md:border-b-0 md:pb-0">
                  {SECTIONS.map(({ href, label }) => {
                    const active = router.pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`shrink-0 rounded px-2.5 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-[var(--warp-veil)] text-foreground'
                            : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="min-w-0">
                  <header className="mb-8">
                    <h1 className="text-2xl tracking-tight text-foreground md:text-3xl">
                      {title}
                    </h1>
                    {description && (
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </header>

                  {children}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
