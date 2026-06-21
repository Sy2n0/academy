import {
  type ReactElement,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import Head from 'next/head';
import useSWR from 'swr';
import {
  Search,
  Info,
  Maximize2,
  Play,
  Square,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SandboxProblem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  positionX: number;
  positionY: number;
  orderIndex: number;
  dockerImage: string | null;
}

interface SandboxSolver {
  user: { id: string; name: string; image: string | null };
  solvedAt: string;
}

interface SandboxResponse {
  data: { problems: SandboxProblem[]; solvedIds: string[] };
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => res.json());

const HEX_SIZE = 34;
const HEX_VISUAL = HEX_SIZE - 3; // slightly smaller for gap between hexagons
const CANVAS_W = 700;
const CANVAS_H = 500;
// Hub is always fixed at the admin canvas center (0.5, 0.5)
const HUB_X = CANVAS_W * 0.5;
const HUB_Y = CANVAS_H * 0.5;

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

// Colors aligned with the Academy brand palette (accent: #2dcc96)
// Uniform fill to keep hexagons visually consistent; stroke/bright for category distinction
const CAT_STYLES = [
  { fill: '#111111', stroke: '#1e5c42', bright: '#2dcc96' }, // teal
  { fill: '#111111', stroke: '#1e3e5c', bright: '#2d8ecc' }, // blue
  { fill: '#111111', stroke: '#4a1e5c', bright: '#9e2dcc' }, // purple
  { fill: '#111111', stroke: '#5c3a1e', bright: '#cc7e2d' }, // amber
  { fill: '#111111', stroke: '#1e5c58', bright: '#2dccc4' }, // cyan
  { fill: '#111111', stroke: '#2e5c1e', bright: '#6acc2d' }, // green
];

function getCatStyle(idx: number) {
  return CAT_STYLES[idx % CAT_STYLES.length];
}

const FlagIcon = ({
  cx,
  cy,
  color,
}: {
  cx: number;
  cy: number;
  color: string;
}) => (
  <g>
    <line
      x1={cx - 2}
      y1={cy - 9}
      x2={cx - 2}
      y2={cy + 9}
      stroke={color}
      strokeWidth="1.2"
    />
    <polygon
      points={`${cx - 2},${cy - 9} ${cx + 6},${cy - 5} ${cx - 2},${cy - 1}`}
      fill={color}
    />
  </g>
);

const SandboxPage: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalProblem, setModalProblem] = useState<SandboxProblem | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(false);
  const [instance, setInstance] = useState<{
    host: string;
    port: number;
  } | null>(null);
  const [flag, setFlag] = useState('');
  const [submitResult, setSubmitResult] = useState<
    'correct' | 'wrong' | 'already_solved' | null
  >(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'challenge' | 'solvers'>(
    'challenge'
  );
  const [solvers, setSolvers] = useState<SandboxSolver[]>([]);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const animFrameRef = useRef<number>();

  const { data, isLoading, mutate } = useSWR<SandboxResponse>(
    '/api/sandbox',
    fetcher
  );
  const problems = useMemo(() => data?.data?.problems ?? [], [data]);
  const solvedIds = useMemo(() => data?.data?.solvedIds ?? [], [data]);

  const categoryMap = useMemo(() => {
    const map = new Map<
      string,
      { problems: SandboxProblem[]; index: number }
    >();
    let idx = 0;
    problems.forEach((p) => {
      if (!map.has(p.category)) {
        map.set(p.category, { problems: [], index: idx++ });
      }
      map.get(p.category)!.problems.push(p);
    });
    return map;
  }, [problems]);

  // Hub is always at the fixed canvas center
  const hub = { x: HUB_X, y: HUB_Y };

  const clusterCenters = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    categoryMap.forEach(({ problems: probs }, cat) => {
      result.set(cat, {
        x:
          (probs.reduce((s, p) => s + p.positionX, 0) / probs.length) *
          CANVAS_W,
        y:
          (probs.reduce((s, p) => s + p.positionY, 0) / probs.length) *
          CANVAS_H,
      });
    });
    return result;
  }, [categoryMap]);

  const fitView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: w, clientHeight: h } = containerRef.current;
    const pad = HEX_SIZE * 4;
    const scale =
      Math.min(w / (CANVAS_W + pad * 2), h / (CANVAS_H + pad * 2), 1.4) * 0.85;
    setTransform({
      scale,
      x: (w - CANVAS_W * scale) / 2,
      y: (h - CANVAS_H * scale) / 2,
    });
    setSelectedId(null);
  }, []);

  useEffect(() => {
    setTimeout(fitView, 120);
  }, [fitView]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(
    () => () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    },
    []
  );

  const zoomToHex = useCallback(
    (problem: SandboxProblem, cx: number, cy: number) => {
      if (dragDistance.current > 5) return;
      if (!containerRef.current) return;
      if (selectedId === problem.id) {
        setModalProblem(problem);
        setFlag('');
        setInstance(null);
        setSubmitResult(null);
        setModalTab('challenge');
        setSolvers([]);
        fetch(`/api/sandbox/submit?problemId=${problem.id}`, {
          credentials: 'include',
        })
          .then((r) => r.json())
          .then((json) => setSolvers(json.data?.solves ?? []));
        return;
      }
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      const target = { scale: 3, x: w / 2 - cx * 3, y: h / 2 - cy * 3 };
      const from = { ...transformRef.current };
      const startTime = performance.now();
      const duration = 500;
      setSelectedId(problem.id);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const step = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
        const next = {
          scale: from.scale + (target.scale - from.scale) * ease,
          x: from.x + (target.x - from.x) * ease,
          y: from.y + (target.y - from.y) * ease,
        };
        setTransform(next);
        transformRef.current = next;
        if (t < 1) animFrameRef.current = requestAnimationFrame(step);
      };
      animFrameRef.current = requestAnimationFrame(step);
    },
    [selectedId]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isPanning.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    dragDistance.current = 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    dragDistance.current += Math.abs(dx) + Math.abs(dy);
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      setTransform((t) => {
        const newScale = Math.max(0.15, Math.min(4, t.scale * factor));
        if (newScale < DESELECT_SCALE) setSelectedId(null);
        const ratio = newScale / t.scale;
        return {
          scale: newScale,
          x: mx - ratio * (mx - t.x),
          y: my - ratio * (my - t.y),
        };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const DESELECT_SCALE = 1.5;
  const zoomIn = () =>
    setTransform((t) => ({ ...t, scale: Math.min(4, t.scale * 1.2) }));
  const zoomOut = () => {
    setTransform((t) => {
      const next = Math.max(0.15, t.scale / 1.2);
      if (next < DESELECT_SCALE) setSelectedId(null);
      return { ...t, scale: next };
    });
  };

  return (
    <>
      <Head>
        <title>{t('sandbox-page-title')}</title>
      </Head>
      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30 bg-background/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-6 h-full">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          {t('sandbox')}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              {/* Map area */}
              <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden select-none"
                style={{
                  background: '#0a0a0a',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onMouseDown={modalProblem ? undefined : onMouseDown}
                onMouseMove={modalProblem ? undefined : onMouseMove}
                onMouseUp={modalProblem ? undefined : onMouseUp}
                onMouseLeave={modalProblem ? undefined : onMouseUp}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="font-mono text-sm text-success">Loading...</p>
                  </div>
                )}
                {!isLoading && problems.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="font-mono text-sm text-white/30">
                      {t('no-challenges-available')}
                    </p>
                  </div>
                )}

                <svg ref={svgRef} className="w-full h-full">
                  <defs>
                    <pattern
                      id="dots"
                      x="0"
                      y="0"
                      width="24"
                      height="24"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle
                        cx="1"
                        cy="1"
                        r="1"
                        fill="#ffffff"
                        opacity="0.07"
                      />
                    </pattern>
                  </defs>

                  {/* Dot background — fixed, not affected by pan/zoom */}
                  <rect width="100%" height="100%" fill="url(#dots)" />

                  <g
                    transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}
                  >
                    {/* Curved dashed connection lines hub → cluster centers */}
                    {Array.from(categoryMap.entries()).map(
                      ([cat, { index: catIdx }]) => {
                        const center = clusterCenters.get(cat);
                        if (!center) return null;
                        const style = getCatStyle(catIdx);
                        const mx = (hub.x + center.x) / 2;
                        const my = (hub.y + center.y) / 2;
                        const dx = center.x - hub.x;
                        const dy = center.y - hub.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        const curve = 28;
                        const cpx = mx - (dy / len) * curve;
                        const cpy = my + (dx / len) * curve;
                        return (
                          <path
                            key={`line-${cat}`}
                            d={`M ${hub.x},${hub.y} Q ${cpx},${cpy} ${center.x},${center.y}`}
                            fill="none"
                            stroke={style.stroke}
                            strokeWidth="1.5"
                            strokeDasharray="7,5"
                            opacity="0.65"
                          />
                        );
                      }
                    )}

                    {/* Per-category hexagons + label */}
                    {Array.from(categoryMap.entries()).map(
                      ([cat, { problems: probs, index: catIdx }]) => {
                        const style = getCatStyle(catIdx);
                        const center = clusterCenters.get(cat)!;
                        const minY =
                          Math.min(...probs.map((p) => p.positionY)) * CANVAS_H;

                        return (
                          <g key={`cat-${cat}`}>
                            {/* Category label */}
                            <text
                              x={center.x}
                              y={minY - HEX_SIZE - 22}
                              textAnchor="middle"
                              fill="white"
                              fontFamily="ui-monospace, 'Courier New', monospace"
                              fontSize="13"
                              fontWeight="700"
                              letterSpacing="2.5"
                            >
                              {cat.toUpperCase()}
                            </text>
                            <line
                              x1={center.x - Math.round(cat.length * 5.15)}
                              y1={minY - HEX_SIZE - 14}
                              x2={center.x + Math.round(cat.length * 5.15)}
                              y2={minY - HEX_SIZE - 14}
                              stroke={style.bright}
                              strokeWidth="1.5"
                            />

                            {/* Hexagons */}
                            {probs.map((problem) => {
                              const cx = problem.positionX * CANVAS_W;
                              const cy = problem.positionY * CANVAS_H;
                              const isSelected = selectedId === problem.id;
                              const isHovered = hoveredId === problem.id;
                              const isSolved = solvedIds.includes(problem.id);
                              return (
                                <g
                                  key={problem.id}
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredId(problem.id)}
                                  onMouseLeave={() => setHoveredId(null)}
                                  onClick={() => zoomToHex(problem, cx, cy)}
                                >
                                  <polygon
                                    points={hexPoints(cx, cy, HEX_VISUAL)}
                                    fill={
                                      isSolved
                                        ? 'rgba(45,204,150,0.12)'
                                        : style.fill
                                    }
                                    stroke={
                                      isHovered || isSelected
                                        ? '#ffffff'
                                        : isSolved
                                          ? '#2dcc96'
                                          : style.stroke
                                    }
                                    strokeWidth={
                                      isHovered || isSelected
                                        ? 2
                                        : isSolved
                                          ? 2
                                          : 1.5
                                    }
                                  />
                                  {selectedId === null ? (
                                    <FlagIcon
                                      cx={cx}
                                      cy={cy}
                                      color={style.stroke}
                                    />
                                  ) : (
                                    (() => {
                                      // Split title into lines of max ~11 chars each to fit inside hexagon
                                      const words = problem.title.split(' ');
                                      const lines: string[] = [];
                                      let current = '';
                                      for (const word of words) {
                                        const candidate = current
                                          ? `${current} ${word}`
                                          : word;
                                        if (
                                          candidate.length > 11 &&
                                          current.length > 0
                                        ) {
                                          lines.push(current);
                                          current = word;
                                        } else {
                                          current = candidate;
                                        }
                                      }
                                      if (current) lines.push(current);
                                      const lineHeight = 8;
                                      const totalHeight =
                                        (lines.length - 1) * lineHeight;
                                      return (
                                        <text
                                          x={cx}
                                          y={cy - totalHeight / 2}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                          fill={
                                            isSelected
                                              ? '#ffffff'
                                              : style.bright
                                          }
                                          fontFamily="ui-monospace, 'Courier New', monospace"
                                          fontSize="6.5"
                                          fontWeight={
                                            isSelected ? '700' : '400'
                                          }
                                          opacity={isSelected ? 1 : 0.7}
                                        >
                                          {lines.map((line, i) => (
                                            <tspan
                                              key={i}
                                              x={cx}
                                              dy={i === 0 ? 0 : lineHeight}
                                            >
                                              {line}
                                            </tspan>
                                          ))}
                                        </text>
                                      );
                                    })()
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        );
                      }
                    )}

                    {/* Center hub hexagon — always visible */}
                    <g>
                      <polygon
                        points={hexPoints(hub.x, hub.y, HEX_SIZE + 8)}
                        fill="#0c2219"
                        stroke="#2dcc96"
                        strokeWidth="1.5"
                      />
                      <image
                        href="/sandbox/sandbox.png"
                        x={hub.x - 54}
                        y={hub.y - 36}
                        width="108"
                        height="72"
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </g>
                  </g>
                </svg>

                {/* Challenge Modal */}
                <Dialog
                  open={!!modalProblem}
                  onOpenChange={(open) => {
                    if (!open) {
                      setModalProblem(null);
                      setSubmitResult(null);
                    }
                  }}
                >
                  <DialogContent className="max-w-2xl bg-background border-border/30">
                    {modalProblem && (
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground">
                              {modalProblem.title}
                            </h1>
                            {solvedIds.includes(modalProblem.id) && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                                SOLVED
                              </span>
                            )}
                          </div>
                          <div className="h-0.5 w-full bg-accent" />
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-border/30">
                          {(['challenge', 'solvers'] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setModalTab(tab)}
                              className={`-mb-px px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors ${
                                modalTab === tab
                                  ? 'text-success border-success'
                                  : 'text-muted-foreground border-transparent'
                              }`}
                            >
                              {tab === 'solvers'
                                ? `Solvers (${solvers.length})`
                                : tab}
                            </button>
                          ))}
                        </div>

                        {modalTab === 'challenge' ? (
                          <>
                            {/* Description */}
                            <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                              {modalProblem.description ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {modalProblem.description}
                                </ReactMarkdown>
                              ) : (
                                <p className="text-sm leading-relaxed">
                                  {t('no-description-provided')}
                                </p>
                              )}
                            </div>
                            <div className="h-px w-full bg-border/30" />

                            {/* Machine */}
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-base font-bold text-foreground mb-1">
                                    {t('requires-instance')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {t('instance-duration')}
                                  </p>
                                </div>
                                {instance ? (
                                  <Button
                                    onClick={async () => {
                                      await fetch(
                                        `/api/sandbox/instance?problemId=${modalProblem!.id}`,
                                        {
                                          method: 'DELETE',
                                          credentials: 'include',
                                        }
                                      );
                                      setInstance(null);
                                    }}
                                    className="bg-accent hover:bg-accent/90 text-foreground border border-accent/50 px-4 py-2"
                                  >
                                    <Square className="h-4 w-4 mr-2" />{' '}
                                    {t('stop')}
                                  </Button>
                                ) : (
                                  <Button
                                    disabled={instanceLoading}
                                    onClick={async () => {
                                      setInstanceLoading(true);
                                      try {
                                        const res = await fetch(
                                          '/api/sandbox/instance',
                                          {
                                            method: 'POST',
                                            credentials: 'include',
                                            headers: {
                                              'Content-Type':
                                                'application/json',
                                            },
                                            body: JSON.stringify({
                                              problemId: modalProblem!.id,
                                            }),
                                          }
                                        );
                                        const json = await res.json();
                                        if (json.data)
                                          setInstance({
                                            host: json.data.host,
                                            port: json.data.port,
                                          });
                                      } finally {
                                        setInstanceLoading(false);
                                      }
                                    }}
                                    className="bg-accent hover:bg-accent/90 text-foreground border border-accent/50 px-4 py-2"
                                  >
                                    <Play className="h-4 w-4 mr-2" />{' '}
                                    {instanceLoading
                                      ? t('starting')
                                      : t('create')}
                                  </Button>
                                )}
                              </div>

                              {instance && (
                                <div className="rounded-md p-3 flex items-center justify-between gap-3 bg-success/5 border border-success/20">
                                  <div className="min-w-0">
                                    <p className="font-mono text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">
                                      {t('connection')}
                                    </p>
                                    <p className="font-mono text-sm font-bold text-white break-all">
                                      {`http://${instance.host}:${instance.port}`}
                                    </p>
                                  </div>
                                  <a
                                    href={`http://${instance.host}:${instance.port}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-[10px] bg-success/10 border border-success/30 text-success transition-colors hover:bg-success/20"
                                  >
                                    <ExternalLink size={11} /> OPEN
                                  </a>
                                </div>
                              )}
                              <div className="h-px w-full bg-border/30" />
                            </div>

                            {/* Flag Submission */}
                            <div className="space-y-2">
                              {submitResult === 'correct' ||
                              submitResult === 'already_solved' ? (
                                <div className="rounded-md p-3 text-center font-mono text-sm font-bold bg-success/10 border border-success/30 text-success">
                                  {submitResult === 'correct'
                                    ? '🎉 Correct! Challenge solved.'
                                    : '✓ Already solved.'}
                                </div>
                              ) : (
                                <>
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      if (!flag.trim()) return;
                                      setSubmitLoading(true);
                                      try {
                                        const res = await fetch(
                                          '/api/sandbox/submit',
                                          {
                                            method: 'POST',
                                            credentials: 'include',
                                            headers: {
                                              'Content-Type':
                                                'application/json',
                                            },
                                            body: JSON.stringify({
                                              problemId: modalProblem!.id,
                                              flag,
                                            }),
                                          }
                                        );
                                        const json = await res.json();
                                        setSubmitResult(
                                          json.data?.result ?? 'wrong'
                                        );
                                        if (json.data?.result === 'correct') {
                                          mutate(); // solvedIds 갱신 → 헥사곤 색상 즉시 반영
                                          fetch(
                                            `/api/sandbox/submit?problemId=${modalProblem!.id}`,
                                            { credentials: 'include' }
                                          )
                                            .then((r) => r.json())
                                            .then((d) =>
                                              setSolvers(d.data?.solves ?? [])
                                            );
                                        }
                                      } finally {
                                        setSubmitLoading(false);
                                      }
                                    }}
                                    className="flex gap-2"
                                  >
                                    <Input
                                      type="text"
                                      placeholder="HUB{...}"
                                      value={flag}
                                      onChange={(e) => {
                                        setFlag(e.target.value);
                                        setSubmitResult(null);
                                      }}
                                      className="flex-1 h-11 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground"
                                    />
                                    <Button
                                      type="submit"
                                      disabled={!flag.trim() || submitLoading}
                                      className="bg-accent hover:bg-accent/90 text-foreground border border-accent/50 px-4 py-2 h-11"
                                    >
                                      {submitLoading
                                        ? t('checking')
                                        : t('submit-flag')}
                                    </Button>
                                  </form>
                                  {submitResult === 'wrong' && (
                                    <p className="font-mono text-xs text-center text-destructive">
                                      {t('incorrect-flag')}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          /* Solvers Tab */
                          <div className="space-y-2 min-h-[120px]">
                            {solvers.length === 0 ? (
                              <p className="font-mono text-xs text-muted-foreground text-center py-8">
                                {t('no-solvers-yet')}
                              </p>
                            ) : (
                              solvers.map((s, i) => (
                                <div
                                  key={s.user.id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border/40"
                                >
                                  <span className="font-mono text-xs text-muted-foreground w-5 text-right">
                                    {i + 1}
                                  </span>
                                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent overflow-hidden shrink-0">
                                    {s.user.image ? (
                                      <img
                                        src={s.user.image}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      s.user.name?.[0]?.toUpperCase()
                                    )}
                                  </div>
                                  <span className="flex-1 text-sm text-foreground">
                                    {s.user.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {new Date(s.solvedAt).toLocaleDateString()}
                                  </span>
                                  {i === 0 && (
                                    <span className="font-mono text-[10px] text-amber-500">
                                      {t('first-blood')}
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Zoom + action controls */}
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-10">
                  <div className="flex flex-col rounded-md overflow-hidden border border-white/10 bg-black/70">
                    <button
                      onClick={zoomIn}
                      className="px-3 py-2 font-mono text-base text-white/60 hover:text-white transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={fitView}
                      className="px-3 py-2 flex items-center justify-center border-y border-white/10 text-white/60 hover:text-white transition-colors"
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      onClick={zoomOut}
                      className="px-3 py-2 font-mono text-base text-white/60 hover:text-white transition-colors"
                    >
                      −
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {[
                      { icon: <Search size={11} />, label: 'FIND' },
                      { icon: <Info size={11} />, label: 'INFO' },
                    ].map(({ icon, label }) => (
                      <button
                        key={label}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-xs bg-black/70 border border-white/10 text-white/60 hover:text-white transition-colors"
                      >
                        {icon} {label}
                      </button>
                    ))}
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

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

SandboxPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default SandboxPage;
