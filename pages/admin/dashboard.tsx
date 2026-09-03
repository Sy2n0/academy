import { useEffect, useState, type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatBar } from '@/components/layouts/StatBar';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  if (!isAdmin(user.role)) {
    return {
      redirect: { destination: '/dashboard', permanent: false },
    };
  }

  // The figures this page used to headline were counts of its own navigation —
  // how many sections and links it rendered — so they told an operator nothing
  // the page did not already show. These are the real ones.
  const [users, teams, machines, sandbox, playground, modules] =
    await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.machine.count({ where: { isActive: true } }),
      prisma.sandboxProblem.count({ where: { isActive: true } }),
      prisma.playgroundChallenge.count({ where: { isActive: true } }),
      prisma.learningModule.count({ where: { isActive: true } }),
    ]);

  const [solves, completions, problems] = await Promise.all([
    prisma.sandboxSolve.findMany({
      orderBy: { solvedAt: 'desc' },
      take: 50,
      select: {
        solvedAt: true,
        user: { select: { name: true } },
        problem: { select: { title: true } },
      },
    }),
    prisma.userModuleCompletion.findMany({
      orderBy: { completedAt: 'desc' },
      take: 50,
      select: {
        completedAt: true,
        user: { select: { name: true } },
        module: { select: { title: true } },
      },
    }),
    prisma.sandboxProblem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        category: true,
        _count: { select: { solves: true } },
      },
    }),
  ]);

  // Two sources with different date columns, merged into one stream. ISO strings
  // sort lexically, which is also what has to cross the serialization boundary.
  const activity = [
    ...solves.map((s) => ({
      kind: 'SANDBOX' as const,
      who: s.user.name ?? 'Unknown',
      what: s.problem.title,
      at: s.solvedAt.toISOString(),
    })),
    ...completions.map((c) => ({
      kind: 'MODULE' as const,
      who: c.user.name ?? 'Unknown',
      what: c.module.title,
      at: c.completedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50);

  const engagement = problems
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      solves: p._count.solves,
    }))
    .sort((a, b) => b.solves - a.solves || a.title.localeCompare(b.title));

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      counts: { users, teams, machines, sandbox, playground, modules },
      activity,
      engagement,
    },
  };
};

/**
 * Dates are formatted after mount. The server and the viewer are not guaranteed
 * to share a timezone, so rendering one on both sides trips hydration.
 */
function ClientDate({ iso }: { iso: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="warp-num text-muted-foreground">
      {new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}
    </span>
  );
}

const AdminDashboard: NextPageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ counts, activity, engagement }) => {
  const maxSolves = Math.max(1, ...engagement.map((e) => e.solves));
  const unsolved = engagement.filter((e) => e.solves === 0).length;

  return (
    <>
      <Head>
        <title>Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Admin" description="플랫폼 운영 현황">
        <StatBar
          stats={[
            { label: 'Users', value: counts.users },
            { label: 'Teams', value: counts.teams },
            { label: 'Machines', value: counts.machines },
            { label: 'Sandbox', value: counts.sandbox },
            { label: 'Playground', value: counts.playground },
            { label: 'Modules', value: counts.modules },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-12">
          <section className="min-w-0">
            <h2 className="border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Recent activity
            </h2>
            {activity.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                아직 기록된 활동이 없습니다.
              </p>
            ) : (
              <ul className="max-h-[26rem] overflow-y-auto overscroll-contain pr-1">
                {activity.map((row, i) => (
                  <li
                    key={`${row.at}-${i}`}
                    className="flex items-baseline gap-3 border-b border-[var(--warp-rule)] py-2.5 text-sm"
                  >
                    <span className="w-24 shrink-0 truncate text-foreground">
                      {row.who}
                    </span>
                    {/* The two kinds are unordered categories, so they are named
                        rather than coloured — a tint here would imply a rank. */}
                    <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {row.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {row.what}
                    </span>
                    <span className="shrink-0 text-[11px]">
                      <ClientDate iso={row.at} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0">
            <h2 className="flex items-baseline justify-between gap-2 border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>Sandbox 현황</span>
              {unsolved > 0 && (
                <span className="warp-num normal-case tracking-normal">
                  미해결 {unsolved}
                </span>
              )}
            </h2>
            <ul className="max-h-[26rem] overflow-y-auto overscroll-contain pr-1">
              {engagement.map((p) => (
                <li key={p.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">
                      {p.title}
                    </span>
                    <span
                      className={`warp-num shrink-0 text-xs ${
                        p.solves === 0 ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {p.solves}
                    </span>
                  </div>
                  {/* Bar length is the whole comparison; nothing is gained by
                      tinting it, so every bar is the same parchment at low
                      opacity and only its width carries the value. */}
                  <div className="mt-1.5 h-px w-full bg-[var(--warp-rule)]">
                    <div
                      className="h-px bg-foreground/50"
                      style={{ width: `${(p.solves / maxSolves) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </AdminLayout>
    </>
  );
};

AdminDashboard.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminDashboard;
