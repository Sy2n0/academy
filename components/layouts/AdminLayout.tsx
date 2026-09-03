import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * The frame the admin pages share.
 *
 * The app sidebar carries no admin links at all, so this rail is the only route
 * to the fifteen management pages. It used to be the whole of /admin/dashboard —
 * a page of links standing in for navigation the shell should have provided,
 * which left no room on it for anything an operator would actually want to see.
 * Moving the links into a rail frees the page body for real state, and carries
 * the navigation into every admin page rather than only the hub.
 */
export type AdminNavGroup = {
  id: string;
  title: string;
  items: { title: string; href: string }[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: 'machines',
    title: 'Machines',
    items: [
      { title: 'Machine manage', href: '/admin/machine-manage' },
      { title: 'Active machines', href: '/admin/machines/active/manage' },
      { title: 'Flags', href: '/admin/machines/flags' },
    ],
  },
  {
    id: 'content',
    title: 'Content',
    items: [
      { title: 'Sandbox', href: '/admin/sandbox' },
      { title: 'Playground', href: '/admin/playground' },
      { title: 'Challenges', href: '/admin/playground/challenges' },
      { title: 'Modules', href: '/admin/learn/modules' },
      { title: 'Tracks', href: '/admin/learn/tracks' },
      { title: 'Attachments', href: '/admin/learn/attachments' },
    ],
  },
  {
    id: 'people',
    title: 'People',
    items: [
      { title: 'Users', href: '/admin/users' },
      { title: 'Teams', href: '/admin/teams' },
      { title: 'Writeups', href: '/admin/writeups' },
      { title: 'Badges', href: '/admin/badges' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { title: 'Monitoring', href: '/admin/monitoring' },
      { title: 'Export', href: '/admin/export' },
      { title: 'Test runs', href: '/admin/test-runs' },
      // { title: 'Analytics', href: '/admin/analytics' }, // 페이지 미구현
    ],
  },
];

export function AdminLayout({
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
              { label: 'Admin', href: '/admin/dashboard' },
              ...(router.pathname === '/admin/dashboard'
                ? []
                : [{ label: title } as const]),
            ]}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1240px] p-5 md:px-10 md:py-8">
              <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
                {/* Fifteen links stacked above the content would push it off a
                    phone screen, so on narrow widths the rail lies down and
                    scrolls sideways, each group led by its own name. */}
                <nav className="-mx-1 flex gap-4 overflow-x-auto border-b border-[var(--warp-rule)] px-1 pb-3 md:mx-0 md:flex-col md:gap-6 md:overflow-visible md:border-b-0 md:px-0 md:pb-0">
                  {ADMIN_NAV.map((group) => (
                    <div
                      key={group.id}
                      className="flex shrink-0 items-center gap-1 md:block md:shrink"
                    >
                      <span className="shrink-0 pr-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:block md:pb-1.5 md:pr-0">
                        {group.title}
                      </span>
                      {group.items.map(({ title: label, href }) => {
                        const active = router.asPath === href;
                        return (
                          <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={`block shrink-0 rounded px-2 py-1 text-[13px] transition-colors md:-mx-2 ${
                              active
                                ? 'bg-[var(--warp-veil)] text-foreground'
                                : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
                            }`}
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>

                <div className="min-w-0">
                  <header className="mb-6">
                    <h1 className="text-2xl tracking-tight text-foreground md:text-3xl">
                      {title}
                    </h1>
                    {description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
