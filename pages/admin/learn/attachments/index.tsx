import { type ReactElement, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { AppSidebar } from '@/components/app-sidebar';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Users,
  Calendar,
  Download,
  ChevronRight,
} from 'lucide-react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  if (!res.ok) {
    let message = `요청에 실패했습니다 (${res.status})`;
    if (isJson) {
      try {
        const err = await res.json();
        message = err?.error?.message || message;
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }
  if (!isJson) {
    throw new Error(
      `서버가 JSON이 아닌 응답을 반환했습니다 (${res.status}). 다시 로그인해 주세요.`
    );
  }
  return res.json();
};

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  targetType: string;
  targetId: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { submissions: number };
}

interface Track {
  id: string;
  title: string;
}

interface Module {
  id: string;
  title: string;
}

const TARGET_LABELS: Record<string, string> = {
  ALL: 'All users',
  TRACK: 'Track enrollees',
  MODULE: 'Module completers',
};

interface SubmissionItem {
  id: string;
  content: string | null;
  attachmentUrl: string | null;
  submittedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

const AdminAttachmentsPage: NextPageWithLayout = () => {
  const PAGE_SIZE = 5;

  const [createOpen, setCreateOpen] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submissionsAssignment, setSubmissionsAssignment] =
    useState<Assignment | null>(null);
  const [submissionsList, setSubmissionsList] = useState<SubmissionItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsSearch, setSubmissionsSearch] = useState('');
  const [submissionsPage, setSubmissionsPage] = useState(0);

  const openSubmissions = async (a: Assignment) => {
    setSubmissionsAssignment(a);
    setSubmissionsList([]);
    setSubmissionsSearch('');
    setSubmissionsPage(0);
    setSubmissionsLoading(true);
    setSubmissionsOpen(true);
    try {
      const res = await fetch(
        `/api/admin/learn/assignments/${a.id}/submissions`,
        { credentials: 'include' }
      );
      const json = await res.json();
      setSubmissionsList(json?.data?.submissions ?? []);
    } catch {
      toast.error('제출 목록을 불러오지 못했습니다');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const filteredSubmissions = submissionsList.filter((s) => {
    const q = submissionsSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.user.name?.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / PAGE_SIZE)
  );
  const pagedSubmissions = filteredSubmissions.slice(
    submissionsPage * PAGE_SIZE,
    submissionsPage * PAGE_SIZE + PAGE_SIZE
  );
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueAt: '',
    targetType: 'ALL' as 'ALL' | 'TRACK' | 'MODULE',
    targetId: '',
  });

  const { data, error, isLoading, mutate } = useSWR<{
    data: Assignment[];
    _warning?: string;
  }>('/api/admin/learn/assignments', fetcher);
  const { data: tracksData } = useSWR<{ data: Track[] }>(
    '/api/admin/learn/tracks',
    fetcher
  );
  const { data: modulesData } = useSWR<{ data: Module[] }>(
    '/api/admin/learn/modules',
    fetcher
  );

  const assignments = data?.data ?? [];
  const schemaWarning = data?._warning;
  const tracks = tracksData?.data ?? [];
  const modules = modulesData?.data ?? [];

  useEffect(() => {
    if (schemaWarning) {
      toast(schemaWarning, { duration: 8000, icon: '⚠️' });
    }
  }, [schemaWarning]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (
      (form.targetType === 'TRACK' || form.targetType === 'MODULE') &&
      !form.targetId
    ) {
      toast.error('Please select who can submit');
      return;
    }
    try {
      const res = await fetch('/api/admin/learn/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          dueAt: form.dueAt || null,
          targetType: form.targetType,
          targetId: form.targetType === 'ALL' ? null : form.targetId || null,
        }),
      });
      if (!res.ok) {
        let errMessage = '생성에 실패했습니다';
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const err = await res.json();
            errMessage = err?.error?.message || errMessage;
          } catch {
            errMessage = `생성에 실패했습니다 (${res.status})`;
          }
        } else {
          errMessage = `생성에 실패했습니다 (${res.status})`;
        }
        throw new Error(errMessage);
      }
      toast.success('Assignment created');
      setCreateOpen(false);
      setForm({
        title: '',
        description: '',
        dueAt: '',
        targetType: 'ALL',
        targetId: '',
      });
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '생성에 실패했습니다');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment? All submissions will be removed.'))
      return;
    try {
      const res = await fetch(`/api/admin/learn/assignments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        let errMessage = '삭제에 실패했습니다';
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const err = await res.json();
            errMessage = err?.error?.message || errMessage;
          } catch {
            errMessage = `삭제에 실패했습니다 (${res.status})`;
          }
        } else {
          errMessage = `삭제에 실패했습니다 (${res.status})`;
        }
        throw new Error(errMessage);
      }
      toast.success('Deleted');
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다');
    }
  };

  const getTargetLabel = (a: Assignment) => {
    if (a.targetType === 'ALL') return 'All users';
    if (a.targetType === 'TRACK' && a.targetId) {
      const t = tracks.find((x) => x.id === a.targetId);
      return t ? `Track: ${t.title}` : 'Track (deleted)';
    }
    if (a.targetType === 'MODULE' && a.targetId) {
      const m = modules.find((x) => x.id === a.targetId);
      return m ? `Module: ${m.title}` : 'Module (deleted)';
    }
    return TARGET_LABELS[a.targetType] ?? a.targetType;
  };

  return (
    <>
      <Head>
        <title>Assignments - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <div className="relative z-10">
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href="/admin/learn"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Learn Management
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Assignments
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                      ASSIGNMENTS
                    </h1>
                    <p className="font-mono text-sm text-muted-foreground">
                      Create assignments and set who can submit
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/admin/learn">
                      <Button
                        variant="outline"
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    </Link>
                    <Button
                      className="font-mono text-xs uppercase tracking-wider"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Assignment
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm">
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/30">
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Title
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Who can submit
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Due date
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Submissions
                            </th>
                            <th className="text-right py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-12 text-center font-mono text-sm text-muted-foreground"
                              >
                                Loading...
                              </td>
                            </tr>
                          ) : error ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-12 text-center font-mono text-sm text-destructive"
                              >
                                목록을 불러오지 못했습니다: {error.message}
                              </td>
                            </tr>
                          ) : assignments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12">
                                <div className="flex flex-col items-center justify-center gap-4 text-center">
                                  <div className="w-14 h-14 rounded-lg border border-border/30 bg-background/60 flex items-center justify-center">
                                    <FileText className="h-7 w-7 text-muted-foreground" />
                                  </div>
                                  <p className="font-mono text-sm text-foreground">
                                    No assignments yet
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground max-w-sm">
                                    Create an assignment and set who can submit.
                                  </p>
                                  <Button
                                    className="font-mono text-xs uppercase tracking-wider"
                                    onClick={() => setCreateOpen(true)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Assignment
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            assignments.map((a) => (
                              <tr
                                key={a.id}
                                className="border-b border-border/20 hover:bg-background/60 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <p className="font-mono text-sm text-foreground">
                                    {a.title}
                                  </p>
                                  {a.description && (
                                    <p className="font-mono text-xs text-muted-foreground truncate max-w-xs">
                                      {a.description}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {getTargetLabel(a)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {a.dueAt
                                      ? new Date(a.dueAt).toLocaleDateString(
                                          'en-US',
                                          {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                          }
                                        )
                                      : '-'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => openSubmissions(a)}
                                    className="font-mono text-xs text-foreground hover:text-accent flex items-center gap-1 transition-colors"
                                  >
                                    {a._count?.submissions ?? 0}명
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-mono text-xs text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(a.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      {/* Submissions Modal */}
      <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
        <DialogContent className="font-mono max-w-xl p-0 overflow-hidden gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/30">
            <DialogTitle className="font-mono text-base font-semibold">
              {submissionsAssignment?.title}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground mt-0.5">
              제출 현황 · 총 {submissionsList.length}명
              {submissionsSearch &&
                ` · 검색 결과 ${filteredSubmissions.length}명`}
            </DialogDescription>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-border/30">
            <Input
              placeholder="이름 또는 이메일로 검색..."
              value={submissionsSearch}
              onChange={(e) => {
                setSubmissionsSearch(e.target.value);
                setSubmissionsPage(0);
              }}
              className="font-mono text-xs h-8"
            />
          </div>

          {/* List */}
          <div className="divide-y divide-border/30 min-h-[200px]">
            {submissionsLoading ? (
              <div className="py-12 text-center font-mono text-xs text-muted-foreground">
                Loading…
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-muted-foreground">
                {submissionsSearch
                  ? '검색 결과가 없습니다.'
                  : '아직 제출한 사람이 없습니다.'}
              </div>
            ) : (
              pagedSubmissions.map((s) => (
                <div key={s.id} className="px-6 py-4 flex gap-4">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-border/40 shrink-0">
                    {s.user.image ? (
                      <img
                        src={s.user.image}
                        alt={s.user.name ?? ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="font-mono text-xs text-muted-foreground uppercase">
                          {(s.user.name ?? s.user.email).charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-foreground leading-none">
                          {s.user.name ?? '—'}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {s.user.email}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {new Date(s.submittedAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </span>
                    </div>
                    {s.content && (
                      <p className="font-mono text-xs text-muted-foreground bg-muted/20 rounded p-2.5 border border-border/30 whitespace-pre-wrap line-clamp-3">
                        {s.content}
                      </p>
                    )}
                    {s.attachmentUrl && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="font-mono text-xs h-7"
                      >
                        <a
                          href={`/api/admin/learn/assignments/${submissionsAssignment?.id}/download?userId=${s.user.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3 w-3 mr-1.5" />
                          파일 다운로드
                        </a>
                      </Button>
                    )}
                    {!s.content && !s.attachmentUrl && (
                      <p className="font-mono text-[10px] text-muted-foreground">
                        내용 없음
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: pagination */}
          <div className="px-6 py-3 border-t border-border/30 bg-muted/10 flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">
              {filteredSubmissions.length > 0
                ? `${submissionsPage * PAGE_SIZE + 1}–${Math.min((submissionsPage + 1) * PAGE_SIZE, filteredSubmissions.length)} / ${filteredSubmissions.length}`
                : '0'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs h-7 px-3"
                disabled={submissionsPage === 0}
                onClick={() => setSubmissionsPage((p) => p - 1)}
              >
                이전
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                {submissionsPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs h-7 px-3"
                disabled={submissionsPage >= totalPages - 1}
                onClick={() => setSubmissionsPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="font-mono max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg uppercase tracking-wider">
              New Assignment
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              Set the title and who can submit. Only users matching the target
              can submit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                Title *
              </Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Assignment title"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                Description
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Assignment description (optional)"
                className="font-mono text-sm min-h-[80px]"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                Due date (optional)
              </Label>
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueAt: e.target.value }))
                }
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                Who can submit *
              </Label>
              <Select
                value={form.targetType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    targetType: v as 'ALL' | 'TRACK' | 'MODULE',
                    targetId: '',
                  }))
                }
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All users</SelectItem>
                  <SelectItem value="TRACK">Track enrollees only</SelectItem>
                  <SelectItem value="MODULE">Module completers only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.targetType === 'TRACK' && (
              <div>
                <Label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                  Select track
                </Label>
                <Select
                  value={form.targetId}
                  onValueChange={(v) => setForm((f) => ({ ...f, targetId: v }))}
                >
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.targetType === 'MODULE' && (
              <div>
                <Label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                  Select module
                </Label>
                <Select
                  value={form.targetId}
                  onValueChange={(v) => setForm((f) => ({ ...f, targetId: v }))}
                >
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                className="font-mono text-xs uppercase tracking-wider"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="font-mono text-xs uppercase tracking-wider"
                onClick={handleCreate}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }
  if (!isAdmin(user.role)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

AdminAttachmentsPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminAttachmentsPage;
