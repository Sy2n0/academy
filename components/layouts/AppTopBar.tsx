import { Fragment, type ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { VpnStatusBadge } from '@/components/machines/VpnStatusBadge';

/** Keep in step with the header's h-* class below. */
export const TOP_BAR_HEIGHT_PX = 48;

export type Crumb = {
  label: ReactNode;
  /** Omit on the last crumb — it renders as the current page, not a link. */
  href?: string;
};

/**
 * The bar above every signed-in page.
 *
 * It exists because the markup was copied into seven pages and drifted: four
 * carried shadcn's `group-has-[[data-collapsible=icon]]:h-12`, which shrank the
 * header from 64px to 48px whenever the sidebar collapsed, and three did not —
 * so collapsing the sidebar changed the top bar's height on some routes only.
 * That coupling is dropped here: sidebar state has nothing to do with how tall
 * the header should be.
 *
 * Trails are passed as data rather than JSX for the same reason — one rendering,
 * so the crumbs cannot drift apart again.
 *
 * Height is exported as TOP_BAR_HEIGHT_PX for the few layouts that have to
 * subtract it from the viewport (split views with their own scroll regions).
 */
export function AppTopBar({
  crumbs,
  actions,
}: {
  crumbs: Crumb[];
  /** Optional controls pinned to the right edge of the bar. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-[var(--warp-rule)]">
      <div className="flex h-full w-full items-center gap-2.5 px-2 md:px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              const linked = !isLast && crumb.href;
              return (
                // Separator is a sibling <li>, not nested inside the item —
                // BreadcrumbItem and BreadcrumbSeparator are both <li>, and
                // nesting them dropped the list's gap between crumb and slash.
                <Fragment key={i}>
                  <BreadcrumbItem
                    // Intermediate crumbs fold away on narrow screens; the
                    // current page always stays.
                    className={isLast ? undefined : 'hidden md:block'}
                  >
                    {linked ? (
                      <BreadcrumbLink
                        href={crumb.href}
                        className="text-[11px] uppercase tracking-[0.12em]"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-[11px] uppercase tracking-[0.12em]">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <VpnStatusBadge />
          {actions}
        </div>
      </div>
    </header>
  );
}
