import { type ReactElement, useEffect, useMemo, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus } from 'lucide-react';

import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { isKucisMember } from '@/lib/kucis';
import { isAdmin } from '@/lib/user-roles';
import { getUserBySession } from 'models/user';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type Status = 'OPEN' | 'TRIAGED' | 'IN_REVIEW' | 'ACCEPTED' | 'CLOSED';

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const TARGETS = ['cFS', 'CF', 'CryptoLib', 'SBN'] as const;

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: '#f85149',
  HIGH: '#db6d28',
  MEDIUM: '#d29922',
  LOW: '#f0f6fc',
  INFO: '#656c76',
};
type Target = (typeof TARGETS)[number];

type Report = {
  id: string;
  title: string;
  team: string;
  target: Target;
  reportedTo: string | null;
  severity: Severity;
  status: Status;
  submittedAt: string;
};

const PAGE_SIZE = 10;

type DashboardProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const KucisDashboard: NextPageWithLayout<DashboardProps> = ({
  reports,
  canManage,
}) => {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [targetFilter, setTargetFilter] = useState<'ALL' | Target>('ALL');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    title: string;
    team: string;
    target: Target;
    reportedTo: string;
    severity: Severity;
    status: Status;
  }>({
    title: '',
    team: '',
    target: 'cFS',
    reportedTo: '',
    severity: 'MEDIUM',
    status: 'OPEN',
  });

  useEffect(() => {
    setPage(1);
  }, [severityFilter, targetFilter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((r) => r.status === 'OPEN').length;
    const inFlight = reports.filter(
      (r) => r.status === 'TRIAGED' || r.status === 'IN_REVIEW'
    ).length;
    const accepted = reports.filter((r) => r.status === 'ACCEPTED').length;
    return { total, open, inFlight, accepted };
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (severityFilter !== 'ALL' && r.severity !== severityFilter)
        return false;
      if (targetFilter !== 'ALL' && r.target !== targetFilter) return false;
      return true;
    });
  }, [reports, severityFilter, targetFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageReports = filteredReports.slice(pageStart, pageStart + PAGE_SIZE);

  const overviewCards = [
    { id: 'total', label: 'Total', value: stats.total },
    { id: 'open', label: 'Open', value: stats.open },
    { id: 'review', label: 'In Review', value: stats.inFlight },
    { id: 'accepted', label: 'Accepted', value: stats.accepted },
  ];

  const resetForm = () => {
    setForm({
      title: '',
      team: '',
      target: 'cFS',
      reportedTo: '',
      severity: 'MEDIUM',
      status: 'OPEN',
    });
    setFormError(null);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (r: Report) => {
    setForm({
      title: r.title,
      team: r.team,
      target: r.target,
      reportedTo: r.reportedTo ?? '',
      severity: r.severity,
      status: r.status,
    });
    setFormError(null);
    setEditingId(r.id);
    setIsFormOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!form.title.trim() || !form.team.trim()) {
      setFormError('제목과 제보자는 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = editingId !== null;
      const url = isEdit
        ? `/api/26-kucis/reports/${editingId}`
        : '/api/26-kucis/reports';
      const method = isEdit ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        team: form.team.trim(),
        target: form.target,
        reportedTo: form.reportedTo.trim()
          ? form.reportedTo.trim()
          : isEdit
            ? null
            : undefined,
        severity: form.severity,
      };
      if (isEdit) body.status = form.status;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to save report');
      }

      setIsFormOpen(false);
      resetForm();
      router.replace(router.asPath);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!editingId || submitting) return;
    if (!window.confirm('이 보고서를 삭제하시겠습니까?')) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/26-kucis/reports/${editingId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to delete report');
      }
      setIsFormOpen(false);
      resetForm();
      router.replace(router.asPath);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Vulnerability Reports - 2026 KUCIS</title>
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
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          2026 KUCIS / Dashboard
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-4 md:py-6">
                  <div className="max-w-6xl mx-auto space-y-6">
                    {/* TITLE */}
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <h1
                          className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground mb-1"
                          style={{ fontStyle: 'italic' }}
                        >
                          VULNERABILITY REPORTS
                        </h1>
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                          2026 KUCIS · Submission overview
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          onClick={openCreate}
                          size="sm"
                          className="font-mono text-xs uppercase tracking-wider gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          New Report
                        </Button>
                      )}
                    </div>

                    {/* OVERVIEW STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {overviewCards.map((card) => (
                        <div
                          key={card.id}
                          className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-4"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {card.label}
                          </p>
                          <p className="font-mono text-2xl text-foreground mt-2">
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* REPORTS */}
                    <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                          Reports
                        </h2>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {filteredReports.length} / {reports.length}
                        </span>
                      </div>

                      {/* FILTERS */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['ALL', ...SEVERITIES] as const).map((s) => {
                          const isActive = severityFilter === s;
                          const color =
                            s !== 'ALL' ? SEVERITY_COLOR[s] : undefined;
                          return (
                            <button
                              key={s}
                              onClick={() => setSeverityFilter(s)}
                              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                                isActive
                                  ? 'border-foreground/60 bg-background/60'
                                  : 'border-border/30 hover:border-accent/50'
                              }`}
                              style={color ? { color } : undefined}
                            >
                              {s}
                            </button>
                          );
                        })}
                        <Separator
                          orientation="vertical"
                          className="h-4 mx-1.5"
                        />
                        {(['ALL', ...TARGETS] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTargetFilter(t)}
                            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                              targetFilter === t
                                ? 'border-foreground/60 bg-background/60 text-foreground'
                                : 'border-border/30 text-muted-foreground hover:border-accent/50 hover:text-foreground'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div className="overflow-x-auto -mx-4 md:-mx-6">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/30 text-left">
                              <th className="px-4 md:px-6 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                제목
                              </th>
                              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                제보자
                              </th>
                              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                Target
                              </th>
                              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                제보처
                              </th>
                              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                Severity
                              </th>
                              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                Status
                              </th>
                              <th className="px-4 md:px-6 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                                Submitted
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageReports.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-3 py-10 text-center font-mono text-xs text-muted-foreground"
                                >
                                  {reports.length === 0
                                    ? canManage
                                      ? 'No reports yet. Click "New Report" to add the first one.'
                                      : 'No reports yet.'
                                    : 'No reports match the current filter.'}
                                </td>
                              </tr>
                            ) : (
                              pageReports.map((r) => (
                                <tr
                                  key={r.id}
                                  onClick={
                                    canManage ? () => openEdit(r) : undefined
                                  }
                                  className={`border-b border-border/20 last:border-0 hover:bg-background/40 transition-colors ${canManage ? 'cursor-pointer' : ''}`}
                                >
                                  <td
                                    className="px-4 md:px-6 py-2.5 font-mono text-[11px] text-foreground/90 max-w-md truncate"
                                    title={canManage ? r.title : undefined}
                                  >
                                    <span
                                      className={
                                        canManage ? '' : 'blur-sm select-none'
                                      }
                                    >
                                      {r.title}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                    {r.team}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                    <span
                                      className={
                                        canManage ? '' : 'blur-sm select-none'
                                      }
                                    >
                                      {r.target}
                                    </span>
                                  </td>
                                  <td
                                    className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground max-w-[180px] truncate"
                                    title={r.reportedTo ?? ''}
                                  >
                                    {r.reportedTo ?? '—'}
                                  </td>
                                  <td
                                    className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap"
                                    style={{
                                      color: SEVERITY_COLOR[r.severity],
                                    }}
                                  >
                                    {r.severity}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                    {r.status.replace('_', ' ')}
                                  </td>
                                  <td className="px-4 md:px-6 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                    {r.submittedAt}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {filteredReports.length > 0 && (
                        <div className="flex items-center justify-between pt-2">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {pageStart + 1}–
                            {Math.min(
                              pageStart + PAGE_SIZE,
                              filteredReports.length
                            )}{' '}
                            of {filteredReports.length}
                          </p>
                          {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() =>
                                  setPage((p) => Math.max(1, p - 1))
                                }
                                className="font-mono text-[10px] uppercase tracking-wider"
                              >
                                Previous
                              </Button>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {currentPage} / {totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() =>
                                  setPage((p) => Math.min(totalPages, p + 1))
                                }
                                className="font-mono text-[10px] uppercase tracking-wider"
                              >
                                Next
                              </Button>
                            </div>
                          )}
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              {editingId ? 'Edit Report' : 'New Vulnerability Report'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">
                제목
              </Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Stack overflow in CFDP PDU parser..."
                maxLength={300}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">
                제보자
              </Label>
              <Input
                value={form.team}
                onChange={(e) =>
                  setForm((f) => ({ ...f, team: e.target.value }))
                }
                placeholder="e.g. Jiyong Yang"
                maxLength={120}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">
                제보처{' '}
                <span className="normal-case text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                value={form.reportedTo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reportedTo: e.target.value }))
                }
                placeholder="e.g. NASA cFS GitHub Issues, MITRE, vendor email..."
                maxLength={300}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">
                  Target
                </Label>
                <Select
                  value={form.target}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, target: v as Target }))
                  }
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGETS.map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                        className="font-mono text-xs"
                      >
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">
                  Severity
                </Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, severity: v as Severity }))
                  }
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="font-mono text-xs"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingId && (
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">
                  Status
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as Status }))
                  }
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        'OPEN',
                        'TRIAGED',
                        'IN_REVIEW',
                        'ACCEPTED',
                        'CLOSED',
                      ] as Status[]
                    ).map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="font-mono text-xs"
                      >
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formError && (
              <p className="font-mono text-[11px] text-red-400">{formError}</p>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    disabled={submitting}
                    className="font-mono text-xs uppercase tracking-wider text-red-400 hover:text-red-300"
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                  className="font-mono text-xs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="font-mono text-xs uppercase tracking-wider"
                >
                  {submitting ? 'Saving...' : editingId ? 'Save' : 'Submit'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

function formatSubmittedAt(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
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

  const [dbReports, kucisMember] = await Promise.all([
    prisma.kucisVulnerabilityReport.findMany({
      orderBy: { submittedAt: 'desc' },
    }),
    isKucisMember(user.id),
  ]);

  const canManage = isAdmin(user.role) || kucisMember;

  const LOREM =
    'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat';
  const redact = (original: string) =>
    LOREM.slice(0, Math.max(original.length, 4));

  const reports: Report[] = dbReports.map((r) => ({
    id: r.id,
    title: canManage ? r.title : redact(r.title),
    team: r.team,
    target: (canManage ? r.target : redact(r.target)) as Target,
    reportedTo: r.reportedTo,
    severity: r.severity as Severity,
    status: r.status as Status,
    submittedAt: formatSubmittedAt(r.submittedAt),
  }));

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      reports,
      canManage,
    },
  };
}

KucisDashboard.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default KucisDashboard;
