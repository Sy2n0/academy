import app from '@/lib/app';
import { SessionProvider } from 'next-auth/react';
import { appWithTranslation } from 'next-i18next';
import { JetBrains_Mono } from 'next/font/google';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import colors from 'tailwindcss/colors';
import type { AppPropsWithLayout } from 'types';
import mixpanel from 'mixpanel-browser';

import '@boxyhq/react-ui/dist/react-ui.css';
import '../styles/globals.css';
import { useEffect } from 'react';
import env from '@/lib/env';
import { Theme, applyTheme } from '@/lib/theme';
import { Themer } from '@boxyhq/react-ui/shared';

import { useRouter } from 'next/router';
import { DefaultLayout } from '@/components/layouts';

// App-wide UI font for the redesigned (Direction C — hacker console) surfaces:
// monospace-native (JetBrains Mono). Legacy surfaces (landing + /auth) restore
// the previous system font via .legacy-theme.
const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jb-mono',
});

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const { session, ...props } = pageProps;
  const router = useRouter();

  // Add mixpanel
  useEffect(() => {
    if (env.mixpanel.token) {
      mixpanel.init(env.mixpanel.token, {
        debug: true,
        ignore_dnt: true,
        track_pageview: true,
      });
    }

    if (env.darkModeEnabled) {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      applyTheme(savedTheme ?? 'dark');
    }
  }, []);

  // sandbox 경로일 때는 레이아웃 없이 렌더링
  if (router.pathname.startsWith('/sandbox')) {
    return (
      <div className={`${jbMono.variable} ${jbMono.className} contents`}>
        <Component {...props} />
      </div>
    );
  }

  const getLayout =
    Component.getLayout || ((page) => <DefaultLayout>{page}</DefaultLayout>);

  // Landing (/) and auth (/auth/*) keep the previous design — scope them to the
  // legacy token set so the refactor only touches the app + admin surfaces.
  const isLegacySurface =
    router.pathname === '/' || router.pathname.startsWith('/auth');
  const page = getLayout(<Component {...props} />);

  return (
    <div className={`${jbMono.variable} ${jbMono.className} contents`}>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>
      <SessionProvider session={session}>
        <Toaster toastOptions={{ duration: 4000 }} />
        <Themer
          overrideTheme={{
            '--primary-color': colors.blue['500'],
            '--primary-hover': colors.blue['600'],
            '--primary-color-50': colors.blue['50'],
            '--primary-color-100': colors.blue['100'],
            '--primary-color-200': colors.blue['200'],
            '--primary-color-300': colors.blue['300'],
            '--primary-color-500': colors.blue['500'],
            '--primary-color-600': colors.blue['600'],
            '--primary-color-700': colors.blue['700'],
            '--primary-color-800': colors.blue['800'],
            '--primary-color-900': colors.blue['900'],
            '--primary-color-950': colors.blue['950'],
          }}
        >
          {isLegacySurface ? (
            <div className="legacy-theme contents">{page}</div>
          ) : (
            page
          )}
        </Themer>
      </SessionProvider>
    </div>
  );
}

export default appWithTranslation(MyApp);
