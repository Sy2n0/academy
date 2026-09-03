import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { StatBar } from '@/components/layouts/StatBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
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
import { Download, Trash2, Paperclip, X } from 'lucide-react';
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
  const [submitters, setSubmitters] = useState<
    { userId: string; name: string; image: string | null }[]
  >([]);
  const [submitContent, setSubmitContent] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewModalAssignment, setViewModalAssignment] =
    useState<AssignmentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDate = (s: string | null) =>
    s
      ? new Date(s).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : null;

  const openSubmit = (a: AssignmentItem) => {
    setSubmittingId(a.id);
    setIsReplaceMode(a.submitted);
    setSubmitContent('');
    setSubmitFile(null);
    setSubmitters([]);
    setSubmitOpen(true);
    fetch(`/api/learn/assignments/${a.id}/submissions`, {
      credentials: 'include',
    })
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
      const res = await fetch(
        `/api/learn/assignments/${assignmentId}/submission`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
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
        const uploadRes = await fetch(
          `/api/learn/assignments/${submittingId}/upload`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }
        );
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          toast.error(
            uploadJson?.error?.message ?? '파일 업로드에 실패했습니다'
          );
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
        body: JSON.stringify({
          content: submitContent.trim() || null,
          attachmentUrl,
        }),
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

      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Learn' },
                { label: 'Attachments' },
              ]}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1040px] p-5 md:px-10 md:py-8">
                <header>
                  <h1 className="text-3xl tracking-tight text-foreground md:text-4xl">
                    Attachments
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    과제를 확인하고 제출하세요.
                  </p>

                  <StatBar
                    stats={[
                      { label: 'Total', value: assignments.length },
                      {
                        label: 'Submitted',
                        value: assignments.filter((a) => a.submitted).length,
                      },
                      {
                        label: 'Open',
                        value: assignments.filter((a) => !a.submitted).length,
                      },
                      {
                        label: 'Overdue',
                        value: assignments.filter(
                          (a) =>
                            !a.submitted &&
                            a.dueAt &&
                            new Date(a.dueAt) < new Date()
                        ).length,
                      },
                    ]}
                  />
                </header>

                {error && (
                  <p className="text-xs text-destructive">
                    과제 목록을 불러오지 못했습니다.
                  </p>
                )}

                {isLoading && (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                )}

                {!error && !isLoading && assignments.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    표시할 과제가 없습니다.{' '}
                    <Link
                      href="/learn/modules"
                      className="underline underline-offset-2"
                    >
                      Modules
                    </Link>{' '}
                    또는{' '}
                    <Link
                      href="/learn/tracks"
                      className="underline underline-offset-2"
                    >
                      Tracks
                    </Link>
                    을 확인하세요.
                  </p>
                )}

                {!error &&
                  !isLoading &&
                  assignments.length > 0 &&
                  (() => {
                    const totalPages = Math.max(
                      1,
                      Math.ceil(assignments.length / PAGE_SIZE)
                    );
                    const paged = assignments.slice(
                      page * PAGE_SIZE,
                      page * PAGE_SIZE + PAGE_SIZE
                    );
                    return (
                      <>
                        {/* Rows, not cards. An assignment list is read for two
                            things — is it in, and when is it due — and a grid of
                            boxes buried both in a corner check mark and 10px
                            grey text. */}
                        <ul className="mt-6 border-t border-[var(--warp-rule)]">
                          {paged.map((a) => {
                            const overdue =
                              !a.submitted &&
                              !!a.dueAt &&
                              new Date(a.dueAt) < new Date();
                            return (
                              <li
                                key={a.id}
                                className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-[var(--warp-rule)] py-3.5"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm text-foreground">
                                    {a.title}
                                  </span>
                                  {a.description && (
                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                      {a.description}
                                    </span>
                                  )}
                                </span>

                                <span className="warp-num hidden w-28 shrink-0 text-right text-xs text-muted-foreground md:inline">
                                  {a.dueAt ? formatDate(a.dueAt) : '—'}
                                </span>

                                {/* One word carries the state: submitted,
                                    overdue, or still open. */}
                                <span
                                  className={`w-20 shrink-0 text-right text-[11px] uppercase tracking-[0.12em] ${
                                    a.submitted
                                      ? 'text-foreground'
                                      : overdue
                                        ? 'text-destructive'
                                        : 'text-muted-foreground'
                                  }`}
                                >
                                  {a.submitted
                                    ? 'Submitted'
                                    : overdue
                                      ? 'Overdue'
                                      : 'Open'}
                                </span>

                                <span className="flex shrink-0 items-center gap-1">
                                  {!a.submitted ? (
                                    <Button
                                      size="sm"
                                      className="h-7 bg-[var(--warp-parchment)] px-3 text-xs text-[var(--warp-void)] hover:bg-[var(--warp-ash)]"
                                      onClick={() => openSubmit(a)}
                                    >
                                      제출
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                          setViewModalAssignment(a)
                                        }
                                      >
                                        보기
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                        disabled={deletingId === a.id}
                                        onClick={() => handleDelete(a.id)}
                                        title="제출 취소"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-2">
                            <span className="warp-num text-[10px] text-muted-foreground">
                              {page * PAGE_SIZE + 1}–
                              {Math.min(
                                (page + 1) * PAGE_SIZE,
                                assignments.length
                              )}{' '}
                              / {assignments.length}개
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-3"
                                disabled={page === 0}
                                onClick={() => setPage((p) => p - 1)}
                              >
                                이전
                              </Button>
                              <span className="warp-num text-xs text-muted-foreground">
                                {page + 1} / {totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="warp-num text-xs h-7 px-3"
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
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* View Modal */}
      <Dialog
        open={!!viewModalAssignment}
        onOpenChange={(open) => !open && setViewModalAssignment(null)}
      >
        <DialogContent className="max-w-md">
          {viewModalAssignment && (
            <>
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-lg font-medium tracking-tight">
                  {viewModalAssignment.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-baseline gap-x-4 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="text-foreground">Submitted</span>
                  {viewModalAssignment.submittedAt && (
                    <span className="warp-num">
                      {formatDate(viewModalAssignment.submittedAt)}
                    </span>
                  )}
                </DialogDescription>
                <span className="block h-px w-full bg-[var(--warp-rule)]" />
              </DialogHeader>
              <div className="space-y-4 py-2">
                {viewModalAssignment.submissionContent && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      내용
                    </p>
                    <p className="whitespace-pre-wrap rounded border border-[var(--warp-rule)] bg-[var(--warp-surface)] p-3 text-sm leading-relaxed text-foreground/90">
                      {viewModalAssignment.submissionContent}
                    </p>
                  </div>
                )}
                {viewModalAssignment.attachmentUrl && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      첨부파일
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 border-[var(--warp-ash)]/50 text-xs"
                    >
                      <a
                        href={
                          viewModalAssignment.attachmentUrl.startsWith(
                            '/api/storage/'
                          )
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
                {!viewModalAssignment.submissionContent &&
                  !viewModalAssignment.attachmentUrl && (
                    <p className="text-xs text-muted-foreground">
                      제출 내용이 없습니다.
                    </p>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Modal */}
      <Dialog open={submitOpen} onOpenChange={(open) => !open && closeSubmit()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
          {/* Header */}
          {(() => {
            const currentAssignment = assignments.find(
              (a) => a.id === submittingId
            );
            return (
              <div className="px-6 pt-6 pb-4 border-b border-[var(--warp-rule)] space-y-3">
                {/* Assignment info */}
                <div>
                  <DialogTitle className="text-lg font-medium leading-snug tracking-tight">
                    {currentAssignment?.title ?? '과제 제출'}
                  </DialogTitle>
                  {currentAssignment?.description && (
                    <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      제출 완료{' '}
                      <span className="warp-num text-foreground">
                        {submitters.length}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {submitters.map((s) => (
                        <div
                          key={s.userId}
                          className="flex items-center gap-1.5"
                        >
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-muted border border-[var(--warp-rule)] shrink-0">
                            {s.image ? (
                              <img
                                src={s.image}
                                alt={s.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <span className="text-[9px] text-muted-foreground uppercase">
                                  {s.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {s.name}
                          </span>
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
              <Label
                htmlFor="submit-content"
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                내용 <span className="normal-case tracking-normal">(선택)</span>
              </Label>
              <Textarea
                id="submit-content"
                placeholder="답변 또는 메모를 입력하세요..."
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
                rows={5}
                className="text-sm resize-none bg-[var(--warp-surface)] border-[var(--warp-rule)] focus-visible:border-border placeholder:text-muted-foreground/40"
              />
            </div>

            {/* File drop zone */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                파일 첨부{' '}
                <span className="normal-case tracking-normal">
                  (선택 · 최대 500MB)
                </span>
              </Label>
              <label
                htmlFor="submit-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--warp-rule)] px-6 py-8 transition-colors hover:border-[var(--warp-ash)]/50 hover:bg-[var(--warp-veil)]"
              >
                {submitFile ? (
                  <div className="flex items-center gap-2 w-full">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground flex-1 truncate">
                      {submitFile.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
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
                    <span className="text-xs text-muted-foreground">
                      클릭하여 파일 선택
                    </span>
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
          <div className="flex items-center justify-end gap-2 border-t border-[var(--warp-rule)] px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={closeSubmit}
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              size="sm"
              className="bg-[var(--warp-parchment)] px-5 text-xs text-[var(--warp-void)] hover:bg-[var(--warp-ash)]"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? '처리 중…'
                : isReplaceMode
                  ? '수정하기'
                  : '제출하기'}
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
