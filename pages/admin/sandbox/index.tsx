import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
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
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);
  if (!user)
    return { redirect: { destination: '/auth/login', permanent: false } };
  if (!isAdmin(user.role))
    return { redirect: { destination: '/dashboard', permanent: false } };
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

interface SandboxProblem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  dockerImage: string | null;
  containerPort: number;
  flag: string | null;
  positionX: number;
  positionY: number;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Hex Grid Math (flat-top) ────────────────────────────────────────────────
const MAP_W = 700;
const MAP_H = 500;
const HUB_X = MAP_W * 0.5; // 350
const HUB_Y = MAP_H * 0.5; // 250
const HEX_R = 34; // must match HEX_SIZE in /arena/sandbox
const SQRT3 = Math.sqrt(3);

/** Axial grid → SVG pixel */
function g2p(q: number, r: number) {
  return {
    x: HUB_X + HEX_R * 1.5 * q,
    y: HUB_Y + HEX_R * (SQRT3 * 0.5 * q + SQRT3 * r),
  };
}

/** SVG pixel → fractional axial grid */
function p2g(x: number, y: number) {
  const dx = x - HUB_X,
    dy = y - HUB_Y;
  return { q: ((2 / 3) * dx) / HEX_R, r: (-dx / 3 + (dy * SQRT3) / 3) / HEX_R };
}

/** Round fractional axial to nearest integer grid cell */
function roundG(q: number, r: number) {
  const s = -q - r;
  let rq = Math.round(q),
    rr = Math.round(r);
  const rs = Math.round(s);
  const qd = Math.abs(rq - q),
    rd = Math.abs(rr - r),
    sd = Math.abs(rs - s);
  if (qd > rd && qd > sd) rq = -rr - rs;
  else if (rd > sd) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** 6 axial neighbors */
function neighbors(q: number, r: number) {
  return [
    { q: q + 1, r },
    { q: q - 1, r },
    { q, r: r + 1 },
    { q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

/** Hex grid distance */
function hexDist(q1: number, r1: number, q2: number, r2: number) {
  return Math.max(
    Math.abs(q1 - q2),
    Math.abs(r1 - r2),
    Math.abs(q1 + r1 - q2 - r2)
  );
}

function gk(q: number, r: number) {
  return `${q},${r}`;
}

/**
 * A grid cell is valid for `cat` if:
 *  1. It is empty
 *  2. None of its 6 neighbors hold a DIFFERENT category
 */
function isValid(q: number, r: number, cat: string, occ: Map<string, string>) {
  if (occ.has(gk(q, r))) return false;
  for (const n of neighbors(q, r)) {
    const nc = occ.get(gk(n.q, n.r));
    if (nc !== undefined && nc !== cat) return false;
  }
  return true;
}

/** BFS outward from (tq, tr) to find nearest valid cell */
function nearestValid(
  tq: number,
  tr: number,
  cat: string,
  occ: Map<string, string>
) {
  const visited = new Set<string>([gk(tq, tr)]);
  const queue: Array<{ q: number; r: number }> = [{ q: tq, r: tr }];
  while (queue.length) {
    const { q, r } = queue.shift()!;
    if (isValid(q, r, cat, occ)) return { q, r };
    for (const n of neighbors(q, r)) {
      const nk = gk(n.q, n.r);
      if (!visited.has(nk) && hexDist(n.q, n.r, tq, tr) <= 30) {
        visited.add(nk);
        queue.push(n);
      }
    }
  }
  return { q: tq, r: tr };
}

/** SVG polygon points for a flat-top hex */
function hexPts(cx: number, cy: number, size: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
  }
  return pts.join(' ');
}

// ─── Color palette (teal-green academy theme) ────────────────────────────────
// Colors aligned with the Academy dark theme (bg: #0a0a0a, border: #262626)
const CAT_STYLES = [
  { fill: '#0f1b12', stroke: '#166534', bright: '#22c55e' }, // green  (green-500)
  { fill: '#0f1420', stroke: '#1e3a8a', bright: '#3b82f6' }, // blue   (blue-500)
  { fill: '#1f0f0f', stroke: '#7f1d1d', bright: '#ef4444' }, // red    (red-500)
  { fill: '#160f1e', stroke: '#581c87', bright: '#a855f7' }, // purple (purple-500)
  { fill: '#1c1508', stroke: '#78350f', bright: '#f59e0b' }, // amber  (amber-500)
  { fill: '#0a1619', stroke: '#164e63', bright: '#06b6d4' }, // cyan   (cyan-500)
];
function catStyle(idx: number) {
  return CAT_STYLES[idx % CAT_STYLES.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminSandboxPage() {
  const [problems, setProblems] = useState<SandboxProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [dockerImage, setDockerImage] = useState('');
  const [containerPort, setContainerPort] = useState('7681');
  const [flag, setFlag] = useState('');
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');
  const [positionX, setPositionX] = useState(0.5);
  const [positionY, setPositionY] = useState(0.5);
  const [saving, setSaving] = useState(false);

  // Map interaction state
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapT, setMapT] = useState({ x: 0, y: 0, scale: 1 });
  const mapTRef = useRef({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [ghostGrid, setGhostGrid] = useState<{ q: number; r: number } | null>(
    null
  );

  useEffect(() => {
    mapTRef.current = mapT;
  }, [mapT]);

  // ── Data ──
  const fetchProblems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sandbox/problems');
      const json = await res.json();
      if (res.ok && json.data) setProblems(json.data);
    } catch {
      toast.error('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // ── Occupied grid (excludes the hex being edited) ──
  const occGrid = useMemo(() => {
    const m = new Map<string, string>();
    problems
      .filter((p) => p.id !== editingId)
      .forEach((p) => {
        const { q, r } = roundG(
          ...(Object.values(p2g(p.positionX * MAP_W, p.positionY * MAP_H)) as [
            number,
            number,
          ])
        );
        m.set(gk(q, r), p.category);
      });
    return m;
  }, [problems, editingId]);

  // ── Placed grid (derived from positionX/Y) ──
  const placedGrid = useMemo(() => {
    const { q, r } = p2g(positionX * MAP_W, positionY * MAP_H);
    return roundG(q, r);
  }, [positionX, positionY]);

  // ── Map fit ──
  const fitMap = useCallback(() => {
    const el = mapRef.current;
    if (!el) return;
    const { clientWidth: w, clientHeight: h } = el;
    const pad = HEX_R * 4;
    const s = Math.min(w / (MAP_W + pad * 2), h / (MAP_H + pad * 2)) * 0.9;
    const t = { x: (w - MAP_W * s) / 2, y: (h - MAP_H * s) / 2, scale: s };
    setMapT(t);
    mapTRef.current = t;
  }, []);

  useEffect(() => {
    if (step === 2) {
      setGhostGrid(null);
      setTimeout(fitMap, 60);
    }
  }, [step, fitMap]);

  // ── Wheel zoom ──
  useEffect(() => {
    if (step !== 2) return;
    const el = mapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      setMapT((t) => {
        const s = Math.max(0.2, Math.min(6, t.scale * factor));
        const ratio = s / t.scale;
        const next = {
          scale: s,
          x: mx - ratio * (mx - t.x),
          y: my - ratio * (my - t.y),
        };
        mapTRef.current = next;
        return next;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [step]);

  // ── Map mouse handlers ──
  const toSvg = (cx: number, cy: number) => {
    const t = mapTRef.current;
    return { x: (cx - t.x) / t.scale, y: (cy - t.y) / t.scale };
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    hasPanned.current = false;
    panStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { x: svgX, y: svgY } = toSvg(
        e.clientX - rect.left,
        e.clientY - rect.top
      );

      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x,
          dy = e.clientY - panStart.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) hasPanned.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        setMapT((t) => {
          const n = { ...t, x: t.x + dx, y: t.y + dy };
          mapTRef.current = n;
          return n;
        });
        return;
      }

      // Snap cursor to nearest valid grid cell
      const cat = category.trim() || '__new__';
      const { q: fq, r: fr } = p2g(svgX, svgY);
      const snapped = roundG(fq, fr);
      const valid = nearestValid(snapped.q, snapped.r, cat, occGrid);
      setGhostGrid(valid);
    },
    [category, occGrid]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!hasPanned.current && ghostGrid) {
        const { x, y } = g2p(ghostGrid.q, ghostGrid.r);
        setPositionX(Math.max(0, Math.min(1, x / MAP_W)));
        setPositionY(Math.max(0, Math.min(1, y / MAP_H)));
      }
      isPanning.current = false;
    },
    [ghostGrid]
  );

  const onMouseLeave = useCallback(() => {
    isPanning.current = false;
    setGhostGrid(null);
  }, []);

  // ── Category index map for colors ──
  const catIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    problems.forEach((p) => {
      if (!m.has(p.category)) m.set(p.category, i++);
    });
    // Ensure current category has an index
    const cat = category.trim();
    if (cat && !m.has(cat)) m.set(cat, i);
    return m;
  }, [problems, category]);

  // ── Category clusters for map rendering ──
  const catClusters = useMemo(() => {
    const m = new Map<string, SandboxProblem[]>();
    problems
      .filter((p) => p.id !== editingId)
      .forEach((p) => {
        if (!m.has(p.category)) m.set(p.category, []);
        m.get(p.category)!.push(p);
      });
    return m;
  }, [problems, editingId]);

  // ── Modal helpers ──
  const openCreate = () => {
    setEditingId(null);
    setStep(1);
    setTitle('');
    setDescription('');
    setCategory('');
    setDockerImage('');
    setContainerPort('7681');
    setFlag('');
    setDescTab('write');
    setPositionX(0.5);
    setPositionY(0.5);
    setModalOpen(true);
  };
  const openEdit = (p: SandboxProblem) => {
    setEditingId(p.id);
    setStep(1);
    setTitle(p.title);
    setDescription(p.description ?? '');
    setCategory(p.category);
    setDockerImage(p.dockerImage ?? '');
    setContainerPort(String(p.containerPort ?? 7681));
    setFlag(p.flag ?? '');
    setPositionX(p.positionX);
    setPositionY(p.positionY);
    setModalOpen(true);
  };
  const goNextStep = () => {
    if (!title.trim()) {
      toast.error('문제 이름을 입력하세요.');
      return;
    }
    if (!category.trim()) {
      toast.error('카테고리를 입력하세요.');
      return;
    }
    setStep(2);
  };
  const handleSubmit = async () => {
    if (!title.trim() || !category.trim()) {
      toast.error('제목과 카테고리를 입력하세요.');
      return;
    }
    // Always save the grid-snapped position
    const { x, y } = g2p(placedGrid.q, placedGrid.r);
    const px = Math.max(0, Math.min(1, x / MAP_W));
    const py = Math.max(0, Math.min(1, y / MAP_H));
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim(),
        dockerImage: dockerImage.trim() || undefined,
        containerPort: parseInt(containerPort, 10) || 7681,
        flag: flag.trim() || undefined,
        positionX: px,
        positionY: py,
      };
      if (editingId) {
        const res = await fetch('/api/admin/sandbox/problems', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingId }),
        });
        if (!res.ok)
          throw new Error((await res.json()).error?.message ?? '수정 실패');
        toast.success('수정했습니다.');
      } else {
        const res = await fetch('/api/admin/sandbox/problems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok)
          throw new Error((await res.json()).error?.message ?? '등록 실패');
        toast.success('등록했습니다.');
      }
      setModalOpen(false);
      setStep(1);
      fetchProblems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('이 문제를 삭제할까요?')) return;
    try {
      const res = await fetch(
        `/api/admin/sandbox/problems?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('삭제 실패');
      toast.success('삭제했습니다.');
      fetchProblems();
    } catch {
      toast.error('삭제하지 못했습니다.');
    }
  };

  // ── SVG map pixel position of placed hex ──
  const placedPx = g2p(placedGrid.q, placedGrid.r);
  const ghostPx = ghostGrid ? g2p(ghostGrid.q, ghostGrid.r) : null;
  const newCatIdx = catIndexMap.get(category.trim()) ?? 0;
  const newStyle = catStyle(newCatIdx);

  return (
    <>
      <Head>
        <title>SANDBOX 관리 - Admin - HUB ACADEMY</title>
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
                        <Link
                          href="/admin/dashboard"
                          className="font-mono text-xs text-muted-foreground hover:text-foreground"
                        >
                          Admin
                        </Link>
                      </BreadcrumbItem>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          SANDBOX
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-4 md:py-6">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-muted-foreground">
                        SANDBOX 문제를 등록하고, 맵에서 그리드 위치를
                        지정합니다.
                      </p>
                      <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> 문제 올리기
                      </Button>
                    </div>
                    {loading ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        불러오는 중...
                      </p>
                    ) : problems.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/50 p-8 text-center font-mono text-xs text-muted-foreground">
                        등록된 문제가 없습니다. &quot;문제 올리기&quot;로
                        추가하세요.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {problems.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between rounded-lg border border-border/30 bg-card/50 px-4 py-3"
                          >
                            <div>
                              <span className="font-mono text-xs font-medium text-foreground">
                                {p.title}
                              </span>
                              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                ({p.category})
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(p)}
                                className="gap-1"
                              >
                                <Pencil className="h-3 w-3" /> 위치/수정
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(p.id)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" /> 삭제
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setStep(1);
        }}
      >
        <DialogContent
          className={
            step === 2 ? 'max-w-5xl p-0 overflow-hidden gap-0' : 'max-w-2xl'
          }
        >
          <DialogHeader
            className={
              step === 2 ? 'px-6 pt-5 pb-3 border-b border-white/10' : ''
            }
            style={step === 2 ? { background: '#0a0a0a' } : {}}
          >
            <DialogTitle
              className="font-mono text-sm uppercase tracking-wider"
              style={step === 2 ? { color: 'rgba(255,255,255,0.7)' } : {}}
            >
              {editingId ? '문제 수정' : '문제 올리기'} —{' '}
              {step === 1 ? '1단계: 문제 정보' : '2단계: 배치 위치'}
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4 px-6 pb-6 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="font-mono text-xs">도커 이미지</Label>
                  <Input
                    value={dockerImage}
                    onChange={(e) => setDockerImage(e.target.value)}
                    placeholder="예: ubuntu:22.04, ctf-challenge:latest"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">컨테이너 포트</Label>
                  <Input
                    value={containerPort}
                    onChange={(e) =>
                      setContainerPort(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="7681"
                    type="text"
                    inputMode="numeric"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">문제 이름</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="문제 제목"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">카테고리 타이틀</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="예: REVERSE ENGINEERING, WEB SECURITY"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs">Flag</Label>
                <Input
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="정답 플래그"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs">
                    문제 설명 (마크다운)
                  </Label>
                  <div className="flex rounded overflow-hidden border border-border/40 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setDescTab('write')}
                      className="px-2.5 py-1 transition-colors"
                      style={{
                        background:
                          descTab === 'write'
                            ? 'rgba(255,255,255,0.08)'
                            : 'transparent',
                        color:
                          descTab === 'write'
                            ? '#fff'
                            : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      WRITE
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescTab('preview')}
                      className="px-2.5 py-1 transition-colors"
                      style={{
                        background:
                          descTab === 'preview'
                            ? 'rgba(255,255,255,0.08)'
                            : 'transparent',
                        color:
                          descTab === 'preview'
                            ? '#fff'
                            : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      PREVIEW
                    </button>
                  </div>
                </div>
                {descTab === 'write' ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="마크다운으로 문제 설명을 작성하세요..."
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : (
                  <div
                    className="min-h-[144px] rounded-md border border-border/40 bg-background/50 px-3 py-2 prose prose-invert prose-sm max-w-none"
                    style={{ fontSize: '12px' }}
                  >
                    {description.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {description}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        미리볼 내용이 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  취소
                </Button>
                <Button onClick={goNextStep}>다음 (위치 지정)</Button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col"
              style={{ height: 560, background: '#0a0a0a' }}
            >
              {/* Toolbar */}
              <div
                className="flex items-center justify-between px-5 py-2.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-4">
                  <p
                    className="font-mono text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    드래그 이동 · 스크롤 줌 · 클릭 배치
                  </p>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: newStyle.bright }}
                  >
                    {category.trim() || '—'} &nbsp;·&nbsp; grid ({placedGrid.q},{' '}
                    {placedGrid.r})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fitMap}
                    className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px]"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <Maximize2 size={11} /> Fit
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="font-mono text-xs h-7"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                    className="font-mono text-xs h-7"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="font-mono text-xs h-7"
                    style={{
                      background: newStyle.bright + '22',
                      borderColor: newStyle.bright,
                      color: newStyle.bright,
                      border: '1px solid',
                    }}
                  >
                    {saving ? '저장 중…' : editingId ? '수정' : '등록'}
                  </Button>
                </div>
              </div>

              {/* SVG map */}
              <div
                ref={mapRef}
                className="flex-1 relative select-none overflow-hidden"
                style={{ cursor: isPanning.current ? 'grabbing' : 'crosshair' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
              >
                <svg className="w-full h-full">
                  <defs>
                    <filter
                      id="sg"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur stdDeviation="3.5" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter
                      id="sgg"
                      x="-70%"
                      y="-70%"
                      width="240%"
                      height="240%"
                    >
                      <feGaussianBlur stdDeviation="6" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g
                    transform={`translate(${mapT.x},${mapT.y}) scale(${mapT.scale})`}
                  >
                    {/* Grid reference dots (faint) */}
                    {Array.from({ length: 13 }, (_, qi) => qi - 6).flatMap(
                      (q) =>
                        Array.from({ length: 9 }, (_, ri) => ri - 4).map(
                          (r) => {
                            const { x, y } = g2p(q, r);
                            return (
                              <circle
                                key={`dot-${q}-${r}`}
                                cx={x}
                                cy={y}
                                r="1.5"
                                fill="rgba(255,255,255,0.04)"
                              />
                            );
                          }
                        )
                    )}

                    {/* Hub → existing cluster center lines */}
                    {Array.from(catClusters.entries()).map(([cat, probs]) => {
                      const cx =
                        (probs.reduce((s, p) => s + p.positionX, 0) /
                          probs.length) *
                        MAP_W;
                      const cy =
                        (probs.reduce((s, p) => s + p.positionY, 0) /
                          probs.length) *
                        MAP_H;
                      return (
                        <line
                          key={`cl-${cat}`}
                          x1={HUB_X}
                          y1={HUB_Y}
                          x2={cx}
                          y2={cy}
                          stroke="#3f3f46"
                          strokeWidth="1"
                          strokeDasharray="5,4"
                          opacity="0.5"
                        />
                      );
                    })}

                    {/* Hub → ghost line (preview) */}
                    {ghostPx && (
                      <line
                        x1={HUB_X}
                        y1={HUB_Y}
                        x2={ghostPx.x}
                        y2={ghostPx.y}
                        stroke={newStyle.bright}
                        strokeWidth="1"
                        strokeDasharray="4,4"
                        opacity="0.3"
                      />
                    )}

                    {/* Hub → placed line */}
                    <line
                      x1={HUB_X}
                      y1={HUB_Y}
                      x2={placedPx.x}
                      y2={placedPx.y}
                      stroke={newStyle.bright}
                      strokeWidth="1.5"
                      strokeDasharray="5,4"
                      opacity="0.65"
                    />

                    {/* Existing hexagons */}
                    {Array.from(catClusters.entries()).map(([cat, probs]) => {
                      const idx = catIndexMap.get(cat) ?? 0;
                      const s = catStyle(idx);
                      const minY =
                        Math.min(...probs.map((p) => p.positionY)) * MAP_H;
                      const cx =
                        (probs.reduce((s2, p) => s2 + p.positionX, 0) /
                          probs.length) *
                        MAP_W;
                      return (
                        <g key={`cg-${cat}`}>
                          <text
                            x={cx}
                            y={minY - HEX_R - 18}
                            textAnchor="middle"
                            fill="white"
                            fontFamily="ui-monospace, monospace"
                            fontSize="11"
                            fontWeight="700"
                            letterSpacing="2.5"
                            opacity="0.65"
                          >
                            {cat.toUpperCase()}
                          </text>
                          <line
                            x1={cx - 50}
                            y1={minY - HEX_R - 10}
                            x2={cx + 50}
                            y2={minY - HEX_R - 10}
                            stroke={s.bright}
                            strokeWidth="1.2"
                            opacity="0.5"
                          />
                          {probs.map((p) => (
                            <polygon
                              key={p.id}
                              points={hexPts(
                                p.positionX * MAP_W,
                                p.positionY * MAP_H,
                                HEX_R
                              )}
                              fill={s.fill}
                              stroke={s.stroke}
                              strokeWidth="1.5"
                            />
                          ))}
                        </g>
                      );
                    })}

                    {/* Hub hexagon */}
                    <g filter="url(#sg)">
                      <polygon
                        points={hexPts(HUB_X, HUB_Y, HEX_R + 6)}
                        fill="#0f0f0f"
                        stroke="#3f3f46"
                        strokeWidth="2"
                      />
                      <circle
                        cx={HUB_X}
                        cy={HUB_Y}
                        r="7"
                        fill="none"
                        stroke="#71717a"
                        strokeWidth="1.5"
                      />
                      {[
                        [-12, 0, -8, 0],
                        [8, 0, 12, 0],
                        [0, -12, 0, -8],
                        [0, 8, 0, 12],
                      ].map(([x1, y1, x2, y2], i) => (
                        <line
                          key={i}
                          x1={HUB_X + x1}
                          y1={HUB_Y + y1}
                          x2={HUB_X + x2}
                          y2={HUB_Y + y2}
                          stroke="#71717a"
                          strokeWidth="1.5"
                        />
                      ))}
                    </g>

                    {/* Ghost hex (snapped, follows cursor) */}
                    {ghostPx && (
                      <g filter="url(#sgg)" opacity="0.5">
                        <polygon
                          points={hexPts(ghostPx.x, ghostPx.y, HEX_R)}
                          fill={newStyle.fill}
                          stroke={newStyle.bright}
                          strokeWidth="1.5"
                        />
                      </g>
                    )}

                    {/* Placed hex (confirmed) */}
                    <g filter="url(#sg)">
                      <polygon
                        points={hexPts(placedPx.x, placedPx.y, HEX_R)}
                        fill={newStyle.fill}
                        stroke={newStyle.bright}
                        strokeWidth="2.5"
                      />
                      {/* Flag icon */}
                      <line
                        x1={placedPx.x - 2}
                        y1={placedPx.y - 11}
                        x2={placedPx.x - 2}
                        y2={placedPx.y + 11}
                        stroke={newStyle.bright}
                        strokeWidth="1.2"
                      />
                      <polygon
                        points={`${placedPx.x - 2},${placedPx.y - 11} ${placedPx.x + 8},${placedPx.y - 7} ${placedPx.x - 2},${placedPx.y - 3}`}
                        fill={newStyle.bright}
                      />
                    </g>
                  </g>
                </svg>

                {/* Grid info overlay */}
                <div
                  className="absolute bottom-3 left-4 font-mono text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  {ghostGrid
                    ? `cursor → grid (${ghostGrid.q}, ${ghostGrid.r})  |  `
                    : ''}
                  placed: ({placedGrid.q}, {placedGrid.r})
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
