/**
 * Which theme each route runs.
 *
 * The class this resolves to goes on <html>, not on a wrapper inside the React
 * tree. Radix portals (Dialog, Sheet, DropdownMenu, Select) mount into
 * document.body, and CSS custom properties inherit down the DOM — so anything
 * portalled escapes a wrapper div and loses the palette. Putting the class on
 * the root element is what makes modals and menus match the page behind them.
 *
 * Kept free of imports so it can be inlined into the pre-paint script in
 * _document.tsx as well as imported by _app.tsx.
 */

/** Landing and auth: the editorial Warp shell. */
export const WARP_THEME_ROUTES = ['/', '/auth'];

/**
 * Signed-in surfaces migrated off Direction C onto the Warp palette. Widen this
 * list one route group at a time — anything absent still renders Direction C,
 * so a half-finished migration degrades to the old look rather than a broken one.
 */
export const WARP_APP_ROUTES = [
  '/dashboard',
  '/rankings',
  '/arena/machine',
  '/arena/sandbox',
  '/learn/modules',
  '/learn/tracks',
  '/learn/attachments',
  '/attackbox',
  '/cloud-ide',
  '/settings',
  '/admin',
  '/playground',
  '/404',
  '/500',
] as const;

export const THEME_CLASSES = ['warp-theme', 'warp-app'] as const;

const matches = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

/** Returns the theme class for a pathname, or null for Direction C. */
export function themeClassFor(pathname: string): string | null {
  if (pathname === '/' || matches(pathname, '/auth')) return 'warp-theme';
  if (WARP_APP_ROUTES.some((route) => matches(pathname, route))) {
    return 'warp-app';
  }
  return null;
}
