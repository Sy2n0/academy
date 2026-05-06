import { type ReactElement, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import Head from 'next/head';
import { Download, Trash2, Send, Eye, CheckCircle2, Paperclip, X } from 'lucide-react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('불러오기에 실패했습니다');
    return r.json();
  });

type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  createdAt: string;
  submitted: boolean;
  submittedAt: string | null;
  attachmentUrl: string | null;
  submissionContent: string | null;
};

type PageProps = {
  user: { name: string; image: string | null };
};

const AttachmentsPage: NextPageWithLayout<PageProps> = ({ user }) => {
  const { data, error, isLoading, mutate } = useSWR<{ data: AssignmentItem[] }>(
    '/api/learn/assignments',
    fetcher
  );
  const assignments = data?.data ?? [];

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(0);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [submitters, setSubmitters] = useState<{ userId: string; name: string; image: string | null }[]>([]);
  const [submitContent, setSubmitContent] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewModalAssignment, setViewModalAssignment] = useState<AssignmentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : null;

  const openSubmit = (a: AssignmentItem) => {
    setSubmittingId(a.id);
    setIsReplaceMode(a.submitted);
    setSubmitContent('');
    setSubmitFile(null);
    setSubmitters([]);
    setSubmitOpen(true);
    fetch(`/api/learn/assignments/${a.id}/submissions`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setSubmitters(j?.data ?? []))
      .catch(() => {});
  };

  const closeSubmit = () => {
    setSubmitOpen(false);
    setSubmittingId(null);
    setIsReplaceMode(false);
    setSubmitContent('');
    setSubmitFile(null);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('제출물을 삭제하시겠습니까?')) return;
    setDeletingId(assignmentId);
    try {
      const res = await fetch(`/api/learn/assignments/${assignmentId}/submission`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || '삭제에 실패했습니다');
      }
      toast.success('삭제되었습니다');
      mutate();
    } catch (e: any) {
      toast.error(e.message || '삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!submittingId) return;
    if (submitFile && submitFile.size <= 0) {
      toast.error('빈 파일은 업로드할 수 없습니다');
      return;
    }
    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      if (submitFile) {
        const formData = new FormData();
        formData.append('file', submitFile);
        const uploadRes = await fetch(`/api/learn/assignments/${submittingId}/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          toast.error(uploadJson?.error?.message ?? '파일 업로드에 실패했습니다');
          setSubmitting(false);
          return;
        }
        attachmentUrl = uploadJson?.data?.url ?? null;
      }
      const method = isReplaceMode ? 'PATCH' : 'POST';
      const res = await fetch(`/api/learn/assignments/${submittingId}/submit`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: submitContent.trim() || null, attachmentUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? '제출에 실패했습니다');
        return;
      }
      toast.success('제출되었습니다');
      closeSubmit();
      mutate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Attachments - HUB ACADEMY</title>
      </Head>

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
                    <BreadcrumbLink href="/learn/modules" className="font-mono text-xs uppercase tracking-wider">
                      Learn
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                      Attachments
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col p-6 md:p-12 pt-8 gap-8">
            <div>
              <h1 className="font-[var(--font-bebas)] text-5xl tracking-tight">ATTACHMENTS</h1>
              <p className="font-mono text-xs text-muted-foreground mt-1">과제를 확인하고 제출하세요.</p>
            </div>

            {error && (
              <p className="font-mono text-xs text-destructive">과제 목록을 불러오지 못했습니다.</p>
            )}

            {isLoading && (
              <p className="font-mono text-xs text-muted-foreground">Loading…</p>
            )}

            {!error && !isLoading && assignments.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground">
                표시할 과제가 없습니다.{' '}
                <Link href="/learn/modules" className="underline underline-offset-2">Modules</Link>
                {' '}또는{' '}
                <Link href="/learn/tracks" className="underline underline-offset-2">Tracks</Link>
                을 확인하세요.
              </p>
            )}

            {!error && !isLoading && assignments.length > 0 && (() => {
              const totalPages = Math.max(1, Math.ceil(assignments.length / PAGE_SIZE));
              const paged = assignments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
              return (
              <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paged.map((a) => (
                  <div
                    key={a.id}
                    className="group relative flex flex-col gap-3 rounded-lg border border-border/40 bg-card/40 p-5 transition-colors hover:border-border/70"
                  >
                    {/* Status indicator */}
                    {a.submitted && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 space-y-1 pr-6">
                      <p className="font-mono text-sm font-medium leading-snug">{a.title}</p>
                      {a.description && (
                        <p className="font-mono text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col gap-0.5">
                      {a.dueAt && (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          마감 · {formatDate(a.dueAt)}
                        </p>
                      )}
                      {a.submitted && a.submittedAt && (
                        <p className="font-mono text-[10px] text-emerald-600">
                          제출 · {formatDate(a.submittedAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
                      {!a.submitted ? (
                        <Button
                          size="sm"
                          className="h-7 px-3 font-mono text-xs"
                          onClick={() => openSubmit(a)}
                        >
                          <Send className="h-3 w-3 mr-1.5" />
                          제출
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-3 font-mono text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setViewModalAssignment(a)}
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            보기
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 font-mono text-xs text-muted-foreground hover:text-destructive"
                            disabled={deletingId === a.id}
                            onClick={() => handleDelete(a.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, assignments.length)} / {assignments.length}개
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs h-7 px-3"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      이전
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs h-7 px-3"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
              </>
              );
            })()}
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* View Modal */}
      <Dialog open={!!viewModalAssignment} onOpenChange={(open) => !open && setViewModalAssignment(null)}>
        <DialogContent className="font-mono max-w-md">
          {viewModalAssignment && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">{viewModalAssignment.title}</DialogTitle>
                {viewModalAssignment.submittedAt && (
                  <DialogDescription className="font-mono text-xs">
                    제출일 · {formatDate(viewModalAssignment.submittedAt)}
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4 py-2">
                {viewModalAssignment.submissionContent && (
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">내용</p>
                    <p className="font-mono text-xs whitespace-pre-wrap bg-muted/30 rounded p-3 border border-border/30">
                      {viewModalAssignment.submissionContent}
                    </p>
                  </div>
                )}
                {viewModalAssignment.attachmentUrl && (
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">첨부파일</p>
                    <Button asChild size="sm" variant="outline" className="font-mono text-xs h-7">
                      <a
                        href={
                          viewModalAssignment.attachmentUrl.startsWith('/api/storage/')
                            ? `${viewModalAssignment.attachmentUrl}${viewModalAssignment.attachmentUrl.includes('?') ? '&' : '?'}download=1`
                            : `/api/learn/assignments/${viewModalAssignment.id}/download`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        다운로드
                      </a>
                    </Button>
                  </div>
                )}
                {!viewModalAssignment.submissionContent && !viewModalAssignment.attachmentUrl && (
                  <p className="font-mono text-xs text-muted-foreground">제출 내용이 없습니다.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Modal */}
      <Dialog open={submitOpen} onOpenChange={(open) => !open && closeSubmit()}>
        <DialogContent className="font-mono max-w-lg p-0 overflow-hidden gap-0">
          {/* Header */}
          {(() => {
            const currentAssignment = assignments.find((a) => a.id === submittingId);
            return (
              <div className="px-6 pt-6 pb-4 border-b border-border/30 space-y-3">
                {/* Assignment info */}
                <div>
                  <DialogTitle className="font-mono text-base font-semibold leading-snug">
                    {currentAssignment?.title ?? '과제 제출'}
                  </DialogTitle>
                  {currentAssignment?.description && (
                    <DialogDescription className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">
                      {currentAssignment.description}
                    </DialogDescription>
                  )}
                  {!currentAssignment?.description && (
                    <DialogDescription className="sr-only">
                      {isReplaceMode ? '제출물 수정' : '과제 제출'}
                    </DialogDescription>
                  )}
                </div>
                {/* Submitters */}
                {submitters.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      제출 완료 · {submitters.length}명
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {submitters.map((s) => (
                        <div key={s.userId} className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-muted border border-border/40 shrink-0">
                            {s.image ? (
                              <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <span className="font-mono text-[9px] text-muted-foreground uppercase">
                                  {s.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Textarea */}
            <div className="space-y-2">
              <Label htmlFor="submit-content" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                내용 <span className="normal-case tracking-normal">(선택)</span>
              </Label>
              <Textarea
                id="submit-content"
                placeholder="답변 또는 메모를 입력하세요..."
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
                rows={5}
                className="font-mono text-sm resize-none bg-muted/20 border-border/40 focus-visible:border-border placeholder:text-muted-foreground/40"
              />
            </div>

            {/* File drop zone */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                파일 첨부 <span className="normal-case tracking-normal">(선택 · 최대 500MB)</span>
              </Label>
              <label
                htmlFor="submit-file"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/10 px-6 py-8 cursor-pointer hover:bg-muted/20 hover:border-border/70 transition-colors"
              >
                {submitFile ? (
                  <div className="flex items-center gap-2 w-full">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs text-foreground flex-1 truncate">{submitFile.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {(submitFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSubmitFile(null);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Paperclip className="h-5 w-5 text-muted-foreground/50" />
                    <span className="font-mono text-xs text-muted-foreground">클릭하여 파일 선택</span>
                  </>
                )}
                <Input
                  id="submit-file"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] ?? null;
                    if (selectedFile && selectedFile.size <= 0) {
                      toast.error('빈 파일은 업로드할 수 없습니다');
                      setSubmitFile(null);
                      e.currentTarget.value = '';
                      return;
                    }
                    setSubmitFile(selectedFile);
                  }}
                  accept="*/*"
                />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/30 bg-muted/10">
            <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={closeSubmit} disabled={submitting}>
              취소
            </Button>
            <Button size="sm" className="font-mono text-xs px-5" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '처리 중…' : isReplaceMode ? '수정하기' : '제출하기'}
            </Button>
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

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      user: { name: user.name, image: user.image ?? null },
    },
  };
}

AttachmentsPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AttachmentsPage;
