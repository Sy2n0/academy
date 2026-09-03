import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactElement,
} from 'react';
import type { NextPageWithLayout } from 'types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatBar } from '@/components/layouts/StatBar';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
  adminInputClass,
  adminLabelClass,
} from '@/components/admin/styles';
import { calculateDynamicValue } from '@/lib/ranks';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Maximize2 } from 'lucide-react';
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
  initialValue: number;
  minimumValue: number;
  decay: number;
  positionX: number;
  positionY: number;
  orderIndex: number;
  isActive: boolean;
  solveCount: number;
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
const AdminSandboxPage: NextPageWithLayout = () => {
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
  const [initialValue, setInitialValue] = useState('300');
  const [minimumValue, setMinimumValue] = useState('100');
  const [decay, setDecay] = useState('15');
  const [isActive, setIsActive] = useState(true);
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
    setInitialValue('300');
    setMinimumValue('100');
    setDecay('15');
    setIsActive(true);
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
    setInitialValue(String(p.initialValue ?? 300));
    setMinimumValue(String(p.minimumValue ?? 100));
    setDecay(String(p.decay ?? 15));
    setIsActive(p.isActive);
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
    const init = parseInt(initialValue, 10) || 300;
    const min = parseInt(minimumValue, 10) || 100;
    const dec = parseInt(decay, 10) || 15;
    // Caught here as well as in the API so the admin sees it before the round
    // trip; a minimum above the initial would make the curve climb.
    if (min > init) {
      toast.error('최소 배점은 초기 배점보다 클 수 없습니다.');
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
        initialValue: init,
        minimumValue: min,
        decay: dec,
        isActive,
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
      <AdminLayout
        title="Sandbox"
        description="문제를 등록하고 맵의 육각형 위치를 지정합니다"
      >
        <StatBar
          stats={[
            { label: 'Challenges', value: problems.length },
            {
              label: 'Visible',
              value: problems.filter((p) => p.isActive).length,
            },
            {
              label: 'Solves',
              value: problems.reduce((sum, p) => sum + (p.solveCount ?? 0), 0),
            },
          ]}
        />

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className={adminButtonPrimaryClass}
          >
            <Plus className="h-3 w-3" />
            Challenge
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-sm text-muted-foreground">불러오는 중...</p>
        ) : problems.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">
            등록된 문제가 없습니다.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            {/* CTFd's challenge table: name, category, current value, state.
                Value is the dynamic one — what the next solver would earn —
                rather than the configured maximum, which stops being true the
                moment anyone clears the problem. */}
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--warp-rule)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-normal">Name</th>
                  <th className="py-2 pr-4 text-left font-normal">Category</th>
                  <th className="py-2 pr-4 text-right font-normal">Value</th>
                  <th className="py-2 pr-4 text-right font-normal">Solves</th>
                  <th className="py-2 pr-4 text-left font-normal">State</th>
                  <th className="py-2 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--warp-rule)]">
                    <td className="py-2.5 pr-4 text-foreground">{p.title}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {p.category}
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-foreground">
                      {calculateDynamicValue(
                        p.initialValue,
                        p.minimumValue,
                        p.decay,
                        p.solveCount ?? 0
                      )}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        /{p.initialValue}
                      </span>
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-muted-foreground">
                      {p.solveCount ?? 0}
                    </td>
                    <td className="py-2.5 pr-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {p.isActive ? 'Visible' : 'Hidden'}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className={adminButtonClass}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className={`${adminButtonClass} hover:text-destructive`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminLayout>

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
              step === 2
                ? 'border-b border-[var(--warp-rule)] bg-[var(--warp-surface)] px-6 pb-3 pt-5'
                : ''
            }
          >
            <DialogTitle className="text-base font-normal">
              {editingId ? '문제 수정' : '문제 올리기'}
              <span className="ml-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {step === 1 ? 'Step 1 · 문제 정보' : 'Step 2 · 배치 위치'}
              </span>
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            /* Field order follows CTFd's create-challenge form: what the
               challenge is, then what it says, then what it is worth, then how
               it is checked — infrastructure last, since it is the one part
               CTFd has no equivalent for. */
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={adminLabelClass}>Name</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="문제 제목"
                    className={adminInputClass}
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>Category</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="예: WEB, PWN, REVERSING"
                    className={adminInputClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className={adminLabelClass}>Message</label>
                  <div className="mb-1.5 flex gap-3">
                    {(['write', 'preview'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDescTab(tab)}
                        className={`text-[10px] uppercase tracking-[0.14em] transition-colors ${
                          descTab === tab
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                {descTab === 'write' ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="마크다운으로 문제 설명을 작성하세요..."
                    rows={6}
                    className={`${adminInputClass} resize-y`}
                  />
                ) : (
                  <div className="prose prose-invert prose-sm min-h-[9rem] max-w-none rounded border border-[var(--warp-rule)] px-3 py-2 text-sm">
                    {description.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {description}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground">
                        미리볼 내용이 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 border-b border-[var(--warp-rule)] pb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Dynamic scoring
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={adminLabelClass}>Initial value</label>
                    <input
                      value={initialValue}
                      onChange={(e) =>
                        setInitialValue(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="300"
                      inputMode="numeric"
                      className={`${adminInputClass} warp-num`}
                    />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Decay limit</label>
                    <input
                      value={decay}
                      onChange={(e) =>
                        setDecay(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="15"
                      inputMode="numeric"
                      className={`${adminInputClass} warp-num`}
                    />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Minimum value</label>
                    <input
                      value={minimumValue}
                      onChange={(e) =>
                        setMinimumValue(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="100"
                      inputMode="numeric"
                      className={`${adminInputClass} warp-num`}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  첫 정답자가 초기 배점을 받고, 푼 사람이 늘수록 최소 배점까지
                  내려갑니다. Decay limit은 최소 배점에 도달하는 풀이 수입니다.
                </p>
              </div>

              <div>
                <label className={adminLabelClass}>Flag</label>
                <input
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="정답 플래그"
                  className={`${adminInputClass} warp-num`}
                />
              </div>

              <div>
                <p className="mb-2 border-b border-[var(--warp-rule)] pb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Container
                </p>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div>
                    <label className={adminLabelClass}>Docker image</label>
                    <input
                      value={dockerImage}
                      onChange={(e) => setDockerImage(e.target.value)}
                      placeholder="예: ubuntu:22.04, ctf-challenge:latest"
                      className={adminInputClass}
                    />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Port</label>
                    <input
                      value={containerPort}
                      onChange={(e) =>
                        setContainerPort(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="7681"
                      inputMode="numeric"
                      className={`${adminInputClass} warp-num`}
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-3.5 w-3.5 accent-white"
                />
                Visible
                <span className="text-xs text-muted-foreground">
                  끄면 맵에 나오지 않습니다
                </span>
              </label>

              <div className="flex justify-end gap-2 border-t border-[var(--warp-rule)] pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={adminButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={goNextStep}
                  className={adminButtonPrimaryClass}
                >
                  다음 — 위치 지정
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col bg-[var(--warp-surface)]"
              style={{ height: 560 }}
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-[var(--warp-rule)] px-5 py-2.5">
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
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`${adminButtonClass} py-1`}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className={`${adminButtonClass} py-1`}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className={`${adminButtonPrimaryClass} py-1`}
                  >
                    {saving ? '저장 중…' : editingId ? '수정' : '등록'}
                  </button>
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
};

AdminSandboxPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminSandboxPage;
