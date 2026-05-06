import { type ReactElement, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { Activity, Flag, AlertCircle, Search, Filter } from 'lucide-react';
import useSWR from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const Monitoring: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
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

  const filteredSubmissions = submissions.filter(
    (sub) =>
      sub.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.submittedFlag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.machine?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = events.filter(
    (event) =>
      event.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.user?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Monitoring - Admin - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href="/admin/dashboard"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Admin
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Monitoring
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-6">
                  <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                      <h1 className="font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight text-foreground mb-2" style={{ fontStyle: 'italic' }}>
                        MONITORING
                      </h1>
                      <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                        Real-time System Monitoring and Logs
                      </p>
                    </div>

                    {/* Search */}
                    <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="font-mono pl-10"
                        />
                      </div>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="submissions" className="font-mono text-xs uppercase tracking-wider">
                          <Flag className="h-4 w-4 mr-2" />
                          Flag Submissions ({filteredSubmissions.length})
                        </TabsTrigger>
                        <TabsTrigger value="events" className="font-mono text-xs uppercase tracking-wider">
                          <Activity className="h-4 w-4 mr-2" />
                          Event Logs ({filteredEvents.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="submissions" className="mt-6">
                        <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                          {filteredSubmissions.length === 0 ? (
                            <p className="font-mono text-sm text-muted-foreground text-center py-8">
                              No submissions found.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {filteredSubmissions.map((sub) => (
                                <div
                                  key={sub.id}
                                  className={`p-4 border rounded-lg ${
                                    sub.isCorrect
                                      ? 'border-accent/30 bg-accent/5'
                                      : 'border-border/30 bg-background/40'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-sm font-semibold text-foreground">
                                          {sub.user.name}
                                        </span>
                                        {sub.isFirstBlood && (
                                          <span className="font-mono text-[9px] text-destructive uppercase tracking-wider px-2 py-0.5 border border-destructive/30 rounded bg-destructive/10">
                                            FIRST BLOOD
                                          </span>
                                        )}
                                        {sub.isCorrect && (
                                          <span className="font-mono text-[9px] text-accent uppercase tracking-wider px-2 py-0.5 border border-accent/30 rounded bg-accent/10">
                                            CORRECT
                                          </span>
                                        )}
                                      </div>
                                      <code className="font-mono text-xs text-muted-foreground break-all">
                                        {sub.submittedFlag}
                                      </code>
                                      {sub.machine && (
                                        <p className="font-mono text-[10px] text-muted-foreground mt-1">
                                          Machine: {sub.machine.title}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      {sub.isCorrect && (
                                        <p className="font-mono text-sm font-bold text-accent">
                                          +{sub.earnedPoints} pts
                                        </p>
                                      )}
                                      <p className="font-mono text-[10px] text-muted-foreground">
                                        {new Date(sub.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="events" className="mt-6">
                        <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                          {filteredEvents.length === 0 ? (
                            <p className="font-mono text-sm text-muted-foreground text-center py-8">
                              No events found.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {filteredEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="p-4 border border-border/30 rounded-lg bg-background/40"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                                          {event.type}
                                        </span>
                                      </div>
                                      <p className="font-mono text-sm text-foreground">
                                        {event.message}
                                      </p>
                                      {event.user && (
                                        <p className="font-mono text-[10px] text-muted-foreground mt-1">
                                          User: {event.user.name}
                                        </p>
                                      )}
                                    </div>
                                    <p className="font-mono text-[10px] text-muted-foreground ml-4">
                                      {new Date(event.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </>
  );
};

Monitoring.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Monitoring;
