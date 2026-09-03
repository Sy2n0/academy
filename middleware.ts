import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import env from './lib/env';

function matchesPattern(pathname: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === pathname) return true;
    if (pattern.endsWith('/**')) {
      const base = pattern.slice(0, -3);
      if (pathname === base || pathname.startsWith(base + '/')) return true;
    } else if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2);
      const rest = pathname.slice(base.length + 1);
      if (pathname.startsWith(base + '/') && !rest.includes('/')) return true;
    } else if (pattern.includes('*/')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$');
      if (regex.test(pathname)) return true;
    }
  }
  return false;
}

// Constants for security headers
const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
} as const;

// Generate CSP
const generateCSP = (useUpgradeInsecureRequests: boolean): string => {
  const policies = {
    'default-src': ["'self'"],
    'img-src': [
      "'self'",
      'boxyhq.com',
      '*.boxyhq.com',
      '*.dicebear.com',
      'data:',
    ],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      '*.gstatic.com',
      '*.google.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': [
      "'self'",
      '*.google.com',
      '*.gstatic.com',
      'boxyhq.com',
      '*.ingest.sentry.io',
      '*.mixpanel.com',
    ],
    'frame-src': ["'self'", 'http:', 'https:', '*.google.com', '*.gstatic.com'],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  return Object.entries(policies)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .concat(useUpgradeInsecureRequests ? ['upgrade-insecure-requests'] : [])
    .join('; ');
};

// Add routes that don't require authentication
const unAuthenticatedRoutes = [
  '/api/hello',
  '/api/health',
  '/api/auth/**',
  '/api/oauth/**',
  '/api/scim/v2.0/**',
  '/api/invitations/*',
  '/api/webhooks/stripe',
  '/api/webhooks/dsync',
  '/api/machines',
  '/api/learn/modules',
  '/api/learn/modules/*', // 모듈 상세 조회는 인증 불필요 (완료 API는 제외)
  '/api/learn/tracks',
  '/auth/**',
  '/invitations/*',
  '/terms-condition',
  '/unlock-account',
  '/login/saml',
  '/.well-known/*',
  '/', // 랜딩 페이지는 인증 없이 접근 가능
  '/preview/*', // 디자인 시안 비교용 (확정 후 제거)
];

// API routes that handle their own authentication
const apiRoutesWithOwnAuth = [
  '/api/admin/**',
  // The OpenVPN server posts tunnel events with no session; it authenticates
  // with the shared X-Api-Key the route checks itself. Without this the hook is
  // redirected to the login page and the app never learns anyone connected.
  '/api/vpn/events',
  '/api/learn/modules/*/status', // 완료 상태 조회는 API에서 인증 처리
  '/api/learn/modules/*/complete', // 완료 처리 API는 API에서 인증 처리
  // Both check the session themselves and answer 401 in JSON; without this the
  // middleware answers a fetch() with an HTML redirect to the login page.
  '/api/learn/modules/*/exercises',
  '/api/learn/modules/*/verify',
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass routes that don't require authentication
  if (matchesPattern(pathname, unAuthenticatedRoutes)) {
    return NextResponse.next();
  }

  // API routes that handle their own authentication - let them through
  if (matchesPattern(pathname, apiRoutesWithOwnAuth)) {
    return NextResponse.next();
  }

  const redirectUrl = new URL('/auth/login', req.url);
  redirectUrl.searchParams.set('callbackUrl', encodeURI(req.url));

  // JWT strategy
  if (env.nextAuth.sessionStrategy === 'jwt') {
    const token = await getToken({
      req,
    });

    if (!token) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Database strategy
  else if (env.nextAuth.sessionStrategy === 'database') {
    const url = new URL('/api/auth/session', req.url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
    });

    const session = await response.json();

    if (!session.user) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  const requestHeaders = new Headers(req.headers);
  const csp = generateCSP(req.nextUrl.protocol === 'https:');

  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (env.securityHeadersEnabled) {
    // Set security headers
    response.headers.set('Content-Security-Policy', csp);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // All good, let the request through
  return response;
}

export const config = {
  // `fonts` is excluded alongside the _next assets: self-hosted webfonts are
  // static files under public/, and routing them through auth turns a missing
  // session into an HTML redirect served in place of the stylesheet.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts/|api/auth/session).*)',
  ],
};
