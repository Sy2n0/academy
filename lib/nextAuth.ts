import type {
  NextApiRequest,
  NextApiResponse,
  GetServerSidePropsContext,
} from 'next';
import { Account, NextAuthOptions, Profile, User } from 'next-auth';
import BoxyHQSAMLProvider from 'next-auth/providers/boxyhq-saml';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { Provider } from 'next-auth/providers';
import { setCookie, getCookie } from 'cookies-next';
import { encode, decode } from 'next-auth/jwt';
import { randomUUID } from 'crypto';

import { Role } from '@prisma/client';
import { getAccount } from 'models/account';
import { addTeamMember, getTeam } from 'models/team';
import { createUser, getUser } from 'models/user';
import { verifyPassword } from '@/lib/auth';
import { isEmailAllowed } from '@/lib/email/utils';
import env from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { isAuthProviderEnabled } from '@/lib/auth';
import { validateRecaptcha } from '@/lib/recaptcha';
import { sendMagicLink } from '@/lib/email/sendMagicLink';
import {
  clearLoginAttempts,
  exceededLoginAttemptsThreshold,
  incrementLoginAttempts,
} from '@/lib/accountLock';
import { slackNotify } from './slack';
import { maxLengthPolicies } from '@/lib/common';
import { forceConsume } from '@/lib/server-common';

const adapter = PrismaAdapter(prisma);
const providers: Provider[] = [];
const sessionMaxAge = 14 * 24 * 60 * 60; // 14 days
const useSecureCookie = env.appUrl.startsWith('https://');

export const sessionTokenCookieName =
  (useSecureCookie ? '__Secure-' : '') + 'next-auth.session-token';

/** 요청이 localhost(HTTP)면 비보안 쿠키 사용 - 개발 서버에서 세션 쿠키 동작하도록 */
function getUseSecureCookieForRequest(
  req: NextApiRequest | GetServerSidePropsContext['req']
): boolean {
  const host = req.headers?.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) return false;
  return env.appUrl.startsWith('https://');
}

/** 요청 도메인에 맞는 세션 쿠키 이름 (localhost면 비보안 쿠키명) - API/라우트에서 쿠키 읽을 때 사용 */
export function getSessionTokenCookieNameForRequest(
  req: NextApiRequest | GetServerSidePropsContext['req']
): string {
  return (
    (getUseSecureCookieForRequest(req) ? '__Secure-' : '') +
    'next-auth.session-token'
  );
}

if (isAuthProviderEnabled('credentials')) {
  providers.push(
    CredentialsProvider({
      id: 'credentials',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
        recaptchaToken: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error('no-credentials');
        }

        const { email, password, recaptchaToken } = credentials;

        await validateRecaptcha(recaptchaToken);

        if (!email || !password) {
          return null;
        }

        const user = await getUser({ email });

        if (!user) {
          throw new Error('invalid-credentials');
        }

        if (exceededLoginAttemptsThreshold(user)) {
          throw new Error('exceeded-login-attempts');
        }

        if (env.confirmEmail && !user.emailVerified) {
          throw new Error('confirm-your-email');
        }

        const hasValidPassword = await verifyPassword(
          password,
          user?.password as string
        );

        if (!hasValidPassword) {
          if (
            exceededLoginAttemptsThreshold(await incrementLoginAttempts(user))
          ) {
            throw new Error('exceeded-login-attempts');
          }

          throw new Error('invalid-credentials');
        }

        await clearLoginAttempts(user);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    })
  );
}

if (isAuthProviderEnabled('github')) {
  providers.push(
    GitHubProvider({
      clientId: env.github.clientId,
      clientSecret: env.github.clientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (isAuthProviderEnabled('google')) {
  providers.push(
    GoogleProvider({
      clientId: env.google.clientId,
      clientSecret: env.google.clientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (isAuthProviderEnabled('saml')) {
  providers.push(
    BoxyHQSAMLProvider({
      authorization: { params: { scope: '' } },
      issuer: env.jackson.selfHosted ? env.jackson.externalUrl : env.appUrl,
      clientId: 'dummy',
      clientSecret: 'dummy',
      allowDangerousEmailAccountLinking: true,
      httpOptions: {
        timeout: 30000,
      },
    })
  );
}
if (isAuthProviderEnabled('idp-initiated')) {
  providers.push(
    CredentialsProvider({
      id: 'boxyhq-idp',
      name: 'IdP Login',
      credentials: {
        code: {
          type: 'text',
        },
      },
      async authorize(credentials) {
        const { code } = credentials || {};

        if (!code) {
          return null;
        }

        const samlLoginUrl = env.jackson.selfHosted
          ? env.jackson.url
          : env.appUrl;

        const res = await fetch(`${samlLoginUrl}/api/oauth/token`, {
          method: 'POST',
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: 'dummy',
            client_secret: 'dummy',
            redirect_url: process.env.NEXTAUTH_URL,
            code,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.status !== 200) {
          forceConsume(res);
          return null;
        }

        const json = await res.json();
        if (!json?.access_token) {
          return null;
        }

        const resUserInfo = await fetch(`${samlLoginUrl}/api/oauth/userinfo`, {
          headers: {
            Authorization: `Bearer ${json.access_token}`,
          },
        });

        if (!resUserInfo.ok) {
          forceConsume(resUserInfo);
          return null;
        }

        const profile = await resUserInfo.json();

        if (profile?.id && profile?.email) {
          return {
            name: [profile.firstName, profile.lastName]
              .filter(Boolean)
              .join(' '),
            image: null,
            ...profile,
          };
        }

        return null;
      },
    })
  );
}

if (isAuthProviderEnabled('email')) {
  providers.push(
    EmailProvider({
      server: {
        host: env.smtp.host,
        port: env.smtp.port,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.password,
        },
      },
      from: env.smtp.from,
      maxAge: 1 * 60 * 60, // 1 hour
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLink(identifier, url);
      },
    })
  );
}

async function createDatabaseSession(
  user,
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + sessionMaxAge * 1000);

  if (adapter.createSession) {
    await adapter.createSession({
      sessionToken,
      userId: user.id,
      expires,
    });
  }

  setCookie(getSessionTokenCookieNameForRequest(req), sessionToken, {
    req,
    res,
    expires,
    secure: getUseSecureCookieForRequest(req),
  });
}

export const getAuthOptions = (
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
) => {
  const isCredentialsProviderCallbackWithDbSession =
    (req as NextApiRequest).query &&
    (req as NextApiRequest).query.nextauth?.includes('callback') &&
    ((req as NextApiRequest).query.nextauth?.includes('credentials') ||
      (req as NextApiRequest).query.nextauth?.includes('boxyhq-idp')) &&
    req.method === 'POST' &&
    env.nextAuth.sessionStrategy === 'database';

  const authOptions: NextAuthOptions = {
    adapter,
    providers,
    pages: {
      signIn: '/auth/login',
      verifyRequest: '/auth/verify-request',
    },
    session: {
      strategy: env.nextAuth.sessionStrategy,
      maxAge: sessionMaxAge,
    },
    secret: env.nextAuth.secret,
    callbacks: {
      async signIn({ user, account, profile }) {
        if (!user || !user.email || !account) {
          return false;
        }

        if (!isEmailAllowed(user.email)) {
          return '/auth/login?error=allow-only-work-email';
        }

        const existingUser = await getUser({ email: user.email });
        const isIdpLogin = account.provider === 'boxyhq-idp';

        // Handle credentials provider
        if (isCredentialsProviderCallbackWithDbSession && !isIdpLogin) {
          await createDatabaseSession(user, req, res);
        }

        if (account?.provider === 'credentials') {
          return true;
        }

        // Login via email (Magic Link)
        if (account?.provider === 'email') {
          return Boolean(existingUser);
        }

        // First time users
        if (!existingUser) {
          const newUser = await createUser({
            name: `${user.name}`,
            email: `${user.email}`,
          });

          await linkAccount(newUser, account);

          if (isIdpLogin && user) {
            await linkToTeam(user as unknown as Profile, newUser.id);
          }

          if (account.provider === 'boxyhq-saml' && profile) {
            await linkToTeam(profile, newUser.id);
          }

          if (isCredentialsProviderCallbackWithDbSession) {
            await createDatabaseSession(newUser, req, res);
          }

          slackNotify()?.alert({
            text: 'New user signed up',
            fields: {
              Name: user.name || '',
              Email: user.email,
            },
          });

          return true;
        }

        // Existing users reach here
        if (isCredentialsProviderCallbackWithDbSession) {
          await createDatabaseSession(existingUser, req, res);
        }

        const linkedAccount = await getAccount({ userId: existingUser.id });

        if (!linkedAccount) {
          await linkAccount(existingUser, account);
        }

        return true;
      },

      async session({ session, token, user }) {
        // When using JWT for sessions, the JWT payload (token) is provided.
        // When using database sessions, the User (user) object is provided.
        if (session && (token || user)) {
          session.user.id = token?.sub || user?.id;
        }

        // For JWT strategy, fetch latest user data from DB to get updated image
        if (token?.sub && !user) {
          const dbUser = await getUser({ id: token.sub as string });
          if (dbUser?.image) {
            session.user.image = dbUser.image;
          }
          if (dbUser?.name) {
            session.user.name = dbUser.name.substring(
              0,
              maxLengthPolicies.name
            );
          }
        }

        // Update image from token or user
        if (token?.image) {
          session.user.image = token.image as string;
        } else if (user?.image) {
          session.user.image = user.image;
        }

        if (user?.name) {
          user.name = user.name.substring(0, maxLengthPolicies.name);
        }
        if (session?.user?.name) {
          session.user.name = session.user.name.substring(
            0,
            maxLengthPolicies.name
          );
        }

        return session;
      },

      async jwt({ token, trigger, session, account, user }) {
        if (trigger === 'signIn' && account?.provider === 'boxyhq-idp') {
          const userByAccount = await adapter.getUserByAccount!({
            providerAccountId: account.providerAccountId,
            provider: account.provider,
          });

          return { ...token, sub: userByAccount?.id };
        }

        // Update token when session is updated
        if (trigger === 'update' && session) {
          if ('name' in session && session.name) {
            token.name = session.name;
          }
          if ('image' in session && session.image) {
            token.image = session.image;
          }
        }

        // Set initial image from user if available
        if (user?.image && !token.image) {
          token.image = user.image;
        }

        return token;
      },
    },
    jwt: {
      encode: async (params) => {
        if (isCredentialsProviderCallbackWithDbSession) {
          const cookieName = getSessionTokenCookieNameForRequest(req);
          return (await getCookie(cookieName, { req, res })) || '';
        }

        return encode(params);
      },

      decode: async (params) => {
        if (isCredentialsProviderCallbackWithDbSession) {
          return null;
        }

        return decode(params);
      },
    },
  };

  return authOptions;
};

type AccountWithOAuth = Account & {
  scope?: string | null;
  token_type?: string | null;
  access_token?: string | null;
};

const linkAccount = async (user: User, account: Account) => {
  if (adapter.linkAccount) {
    const oauth = account as AccountWithOAuth;
    return await adapter.linkAccount({
      providerAccountId: account.providerAccountId,
      userId: user.id,
      provider: account.provider,
      type: 'oauth',
      scope: oauth.scope ?? undefined,
      token_type: oauth.token_type ?? undefined,
      access_token: oauth.access_token ?? undefined,
    });
  }
};

const linkToTeam = async (profile: Profile, userId: string) => {
  const team = await getTeam(profile.requested.tenant);
  if (!team) {
    return;
  }

  // Sort out roles
  const roles = profile.roles || profile.groups || [];
  let userRole: Role = team.defaultRole || Role.MEMBER;

  for (let role of roles) {
    if (env.groupPrefix) {
      role = role.replace(env.groupPrefix, '');
    }

    // Owner > Admin > Member
    if (
      role.toUpperCase() === Role.ADMIN &&
      userRole.toUpperCase() !== Role.OWNER.toUpperCase()
    ) {
      userRole = Role.ADMIN;
      continue;
    }

    if (role.toUpperCase() === Role.OWNER) {
      userRole = Role.OWNER;
      break;
    }
  }

  await addTeamMember(team.id, userId, userRole);
};
