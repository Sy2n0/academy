import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  adminInputClass,
  adminTabsListClass,
  adminTabsTriggerClass,
} from '@/components/admin/styles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Search } from 'lucide-react';
import useSWR from 'swr';
import { matches } from '@/lib/admin-ui';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FlagSubmission {
  id: string;
  machineId: string;
  userId: string;
  teamId: string | null;
  submittedFlag: string;
  isCorrect: boolean;
  earnedPoints: number;
  isFirstBlood: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  machine: {
    id: string;
    title: string;
  } | null;
}

interface EventLog {
  id: string;
  type: string;
  userId: string | null;
  teamId: string | null;
  machineId: string | null;
  message: string;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
  } | null;
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!isAdmin(user.role)) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

function Timestamp({ iso }: { iso: string }) {
  return (
    <span className="warp-num shrink-0 text-[11px] text-muted-foreground">
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

const Monitoring: NextPageWithLayout = () => {
  const [activeTab, setActiveTab] = useState('submissions');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: submissionsData } = useSWR<{
    data: { submissions: FlagSubmission[] };
  }>('/api/admin/monitoring/submissions?limit=100', fetcher);

  const { data: eventsData } = useSWR<{ data: { events: EventLog[] } }>(
    '/api/admin/monitoring/events?limit=100',
    fetcher
  );

  const submissions = submissionsData?.data?.submissions || [];
  const events = eventsData?.data?.events || [];
  const needle = searchQuery.toLowerCase();

  // Every field here was matched with an unguarded .toLowerCase(); a submission
  // from a user with no name took the whole page down.
  const filteredSubmissions = submissions.filter(
    (sub) =>
      matches(sub.user?.name, needle) ||
      matches(sub.submittedFlag, needle) ||
      matches(sub.machine?.title, needle)
  );

  const filteredEvents = events.filter(
    (event) =>
      matches(event.message, needle) ||
      matches(event.type, needle) ||
      matches(event.user?.name, needle)
  );

  return (
    <>
      <Head>
        <title>Monitoring - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Monitoring" description="플래그 제출과 이벤트 로그">
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="사용자, 플래그, 머신, 이벤트 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${adminInputClass} pl-9`}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={adminTabsListClass}>
            <TabsTrigger value="submissions" className={adminTabsTriggerClass}>
              Submissions
              <span className="warp-num ml-2 normal-case tracking-normal">
                {filteredSubmissions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="events" className={adminTabsTriggerClass}>
              Events
              <span className="warp-num ml-2 normal-case tracking-normal">
                {filteredEvents.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="mt-2">
            {filteredSubmissions.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                제출 기록이 없습니다.
              </p>
            ) : (
              <ul className="max-h-[30rem] overflow-y-auto overscroll-contain pr-1">
                {filteredSubmissions.map((sub) => (
                  <li
                    key={sub.id}
                    className="border-b border-[var(--warp-rule)] py-3"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="w-24 shrink-0 truncate text-sm text-foreground">
                        {sub.user?.name ?? 'Unknown'}
                      </span>
                      {/* Correct and incorrect are the two outcomes of the same
                          action, not a warning and a normal state, so neither
                          takes destructive. The wrong one is simply quieter. */}
                      <span
                        className={`w-12 shrink-0 text-[10px] uppercase tracking-[0.14em] ${
                          sub.isCorrect
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {sub.isCorrect ? 'Solved' : 'Miss'}
                      </span>
                      <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {sub.submittedFlag}
                      </code>
                      {sub.isCorrect && (
                        <span className="warp-num shrink-0 text-xs text-foreground">
                          +{sub.earnedPoints}
                        </span>
                      )}
                      <Timestamp iso={sub.createdAt} />
                    </div>
                    {(sub.machine || sub.isFirstBlood) && (
                      <div className="mt-1 flex items-baseline gap-3 pl-[6.75rem] text-[11px] text-muted-foreground">
                        {sub.isFirstBlood && (
                          <span className="uppercase tracking-[0.14em] text-foreground">
                            First blood
                          </span>
                        )}
                        {sub.machine && <span>{sub.machine.title}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-2">
            {filteredEvents.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                이벤트가 없습니다.
              </p>
            ) : (
              <ul className="max-h-[30rem] overflow-y-auto overscroll-contain pr-1">
                {filteredEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-baseline gap-3 border-b border-[var(--warp-rule)] py-3"
                  >
                    <span className="w-28 shrink-0 truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {event.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {event.message}
                    </span>
                    {event.user && (
                      <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">
                        {event.user.name}
                      </span>
                    )}
                    <Timestamp iso={event.createdAt} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </AdminLayout>
    </>
  );
};

Monitoring.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Monitoring;
