import type { NextPageWithLayout, ApiResponse } from 'types';
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { type ReactElement } from 'react';

import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { describeUserAgent } from '@/lib/user-agent';
import { getUserBySession } from 'models/user';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Head from 'next/head';
import { Crown } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type AccountProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Account: NextPageWithLayout<AccountProps> = ({
  user: initialUser,
  logins,
}) => {
  const { data: session } = useSession();
  const [user, setUser] = useState(initialUser);

  // DB에서 최신 user 정보 가져오기 (role 포함)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        const data = (await response.json()) as ApiResponse<any>;
        if (data.data) {
          setUser(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    if (session) {
      fetchUser();
    }
  }, [session]);

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <SettingsLayout
        title="Account"
        description="계정 정보와 보안 상태를 확인합니다."
      >
        {/* Identity first. It used to be the fourth card, under the account
            UUID, the security status and the session list — so the page opened
            on a value nobody came to read. */}
        <div className="flex items-center gap-5 border-b border-[var(--warp-rule)] pb-8">
          <Avatar className="h-20 w-20 rounded-full">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'User'}
              className="rounded-full object-cover"
            />
            <AvatarFallback className="rounded-full bg-[var(--warp-earth)] text-lg text-foreground">
              {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-medium text-foreground">
              {user.name || 'Unnamed'}
            </p>
            <p className="warp-num mt-1 truncate text-sm text-muted-foreground">
              {user.email || '—'}
            </p>
          </div>
        </div>

        {/* 계정 정보 섹션 */}
        <div className="border-b border-[var(--warp-rule)] py-8 last:border-b-0">
          <h3 className="mb-4 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            ACCOUNT INFO
          </h3>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Account ID
              </p>
              <p className="warp-num text-sm text-foreground break-all">
                {user.id}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Member Since
              </p>
              <p className="warp-num text-sm text-foreground">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Last Updated
              </p>
              <p className="warp-num text-sm text-foreground">
                {user.updatedAt
                  ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Role
              </p>
              <div className="flex items-center gap-2">
                {(user.role === UserRole.ADMIN || user.role === 'ADMIN') && (
                  <Crown className="h-4 w-4 text-foreground" />
                )}
                <span
                  className={`inline-flex items-center px-2 py-1 rounded border text-xs uppercase tracking-wider ${
                    user.role === UserRole.ADMIN || user.role === 'ADMIN'
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : user.role === UserRole.LAB || user.role === 'LAB'
                        ? 'border-[var(--warp-ash)]/50 text-foreground'
                        : 'border-[var(--warp-rule)] text-muted-foreground'
                  }`}
                >
                  {user.role || UserRole.USER}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Where the account has been used from. The Session table stays empty
            on the jwt strategy, so this reads LoginActivity, which records one
            row per successful sign-in. */}
        <div className="border-t border-[var(--warp-rule)] py-8">
          <h3 className="mb-4 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Recent sign-ins
          </h3>
          {logins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 기록이 없습니다. 다음 로그인부터 여기에 쌓입니다.
            </p>
          ) : (
            <ul className="border-t border-[var(--warp-rule)]">
              {logins.map((login) => (
                <li
                  key={login.id}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[var(--warp-rule)] py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {login.device}
                    {login.browser && (
                      <span className="text-muted-foreground">
                        {' · '}
                        {login.browser}
                      </span>
                    )}
                  </span>
                  <span className="warp-num w-32 shrink-0 text-right text-xs text-muted-foreground">
                    {login.ip || '—'}
                  </span>
                  <span className="warp-num w-40 shrink-0 text-right text-xs text-muted-foreground">
                    {new Date(login.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsLayout>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);
  const { locale } = context;

  if (!user) {
    return {
      notFound: true,
    };
  }

  const logins = await prisma.loginActivity.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, ip: true, userAgent: true, createdAt: true },
  });

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role || 'USER',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
        lockedAt: user.lockedAt?.toISOString() || null,
        invalidLoginAttempts: user.invalid_login_attempts || 0,
      },
      logins: logins.map((l) => ({
        id: l.id,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
        ...describeUserAgent(l.userAgent),
      })),
    },
  };
};

Account.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Account;
