import { Html, Head, Main, NextScript } from 'next/document';
import { fontVariables } from '@/lib/fonts';

export default function Document() {
  return (
    <Html lang="en" className={fontVariables}>
      <Head />
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) theme = 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'black');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'corporate');
                  }
                } catch(e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'black');
                }

                // Warp palette, resolved before first paint so there is no
                // flash of the Direction C canvas. The class lands on <html>
                // rather than a wrapper because Radix portals (dialogs, menus,
                // selects) mount into document.body and would otherwise render
                // outside the palette. Keep these lists in step with
                // lib/theme-routes.ts.
                try {
                  var path = window.location.pathname;
                  var hit = function (route) {
                    return path === route || path.indexOf(route + '/') === 0;
                  };
                  var cls = null;
                  if (path === '/' || hit('/auth')) {
                    cls = 'warp-theme';
                  } else if (
                    [
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
                    ].some(hit)
                  ) {
                    cls = 'warp-app';
                  }
                  document.documentElement.classList.remove(
                    'warp-theme',
                    'warp-app'
                  );
                  if (cls) document.documentElement.classList.add(cls);
                } catch(e) {}
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
