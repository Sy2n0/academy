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
import { FileText, Check, X, Download, Search, Eye } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Writeup {
  id: string;
  userId: string;
  machineId: string;
  title: string;
  content: string;
  attachmentUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
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

const WriteupManagement: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWriteup, setSelectedWriteup] = useState<Writeup | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const { data: writeupsData, mutate } = useSWR<{
    data: { writeups: Writeup[] };
  }>('/api/admin/writeups', fetcher);

  const writeups = writeupsData?.data?.writeups || [];
  const filteredWriteups = writeups.filter((writeup) => {
    const matchesSearch =
      writeup.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      writeup.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      writeup.machine?.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || writeup.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedWriteup) return;

    try {
      const response = await fetch(
        `/api/admin/writeups/${selectedWriteup.id}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            comment: reviewComment.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || '라이트업 검토에 실패했습니다'
        );
      }

      toast.success(`Writeup ${status} successfully`);
      setIsReviewDialogOpen(false);
      setSelectedWriteup(null);
      setReviewComment('');
      mutate();
    } catch (error: any) {
      toast.error(error.message || '라이트업 검토에 실패했습니다');
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/admin/writeups/download');
      if (!response.ok) throw new Error('라이트업 다운로드에 실패했습니다');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `writeups-${new Date().toISOString()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Writeups downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || '라이트업 다운로드에 실패했습니다');
    }
  };

  const openReviewDialog = (writeup: Writeup) => {
    setSelectedWriteup(writeup);
    setReviewComment('');
    setIsReviewDialogOpen(true);
  };

  return (
    <>
      <Head>
        <title>Writeup Management - Admin - HUB ACADEMY</title>
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
                          Writeup Management
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h1
                          className="font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight text-foreground mb-2"
                          style={{ fontStyle: 'italic' }}
                        >
                          WRITEUP MANAGEMENT
                        </h1>
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                          Review and Manage User Writeups
                        </p>
                      </div>
                      <Button
                        onClick={handleDownload}
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                        <Label className="font-mono text-sm mb-2 block">
                          Search
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Search by title, user, or machine..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="font-mono pl-10"
                          />
                        </div>
                      </div>
                      <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                        <Label className="font-mono text-sm mb-2 block">
                          Status
                        </Label>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger className="font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Writeups List */}
                    <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                      <h2 className="font-mono text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Writeups ({filteredWriteups.length})
                      </h2>

                      {filteredWriteups.length === 0 ? (
                        <p className="font-mono text-sm text-muted-foreground text-center py-8">
                          No writeups found.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {filteredWriteups.map((writeup) => (
                            <div
                              key={writeup.id}
                              className="p-4 border border-border/30 rounded-lg bg-background/40 hover:border-accent/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-mono text-base font-semibold text-foreground mb-1 truncate">
                                    {writeup.title}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs text-muted-foreground">
                                      by {writeup.user.name}
                                    </span>
                                    {writeup.machine && (
                                      <span className="font-mono text-xs text-muted-foreground">
                                        • {writeup.machine.title}
                                      </span>
                                    )}
                                    <span
                                      className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 border rounded ${
                                        writeup.status === 'approved'
                                          ? 'text-accent border-accent/30 bg-accent/10'
                                          : writeup.status === 'rejected'
                                            ? 'text-destructive border-destructive/30 bg-destructive/10'
                                            : 'text-muted-foreground border-border/30 bg-background/60'
                                      }`}
                                    >
                                      {writeup.status}
                                    </span>
                                  </div>
                                  <p className="font-mono text-[10px] text-muted-foreground mt-1">
                                    Submitted:{' '}
                                    {new Date(
                                      writeup.createdAt
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {writeup.status === 'pending' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openReviewDialog(writeup)
                                        }
                                        className="font-mono text-xs"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Review
                                      </Button>
                                    </>
                                  )}
                                  {writeup.attachmentUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        window.open(
                                          writeup.attachmentUrl!,
                                          '_blank'
                                        )
                                      }
                                      className="font-mono text-xs"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle
              className="font-[var(--font-bebas)] text-2xl tracking-tight text-foreground"
              style={{ fontStyle: 'italic' }}
            >
              Review Writeup
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              {selectedWriteup?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedWriteup && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="font-mono text-sm mb-2 block">Content</Label>
                <div className="p-4 border border-border/30 rounded-lg bg-background/40 max-h-64 overflow-y-auto">
                  <p className="font-mono text-sm text-foreground whitespace-pre-wrap">
                    {selectedWriteup.content}
                  </p>
                </div>
              </div>
              <div>
                <Label className="font-mono text-sm mb-2 block">
                  Comment (optional)
                </Label>
                <Input
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="font-mono"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  className="font-mono text-xs uppercase tracking-wider flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleReview('rejected')}
                  variant="destructive"
                  className="font-mono text-xs uppercase tracking-wider flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => handleReview('approved')}
                  className="font-mono text-xs uppercase tracking-wider flex-1 bg-accent hover:bg-accent/90 text-foreground"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

WriteupManagement.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default WriteupManagement;
