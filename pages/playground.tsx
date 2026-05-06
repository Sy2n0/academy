import { type ReactElement, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
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
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PlaygroundUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  points: number;
}

interface PlaygroundLeaderboardResponse {
  data: {
    rankings: PlaygroundUser[];
  };
}

interface PlaygroundSettings {
  name: string;
  codeName: string;
  season: string;
  type: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface PlaygroundSettingsResponse {
  data: PlaygroundSettings;
}

const ticketPenSource = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>__PLAYGROUND_NAME__ Ticket</title>
  <style>
    :root {
      --bg: #111316;
      --logo: url(/public/logo/hub-logo.PNG);
      --logopng: url(https://assets.codepen.io/13471/threads.png);
      --ticket: url(https://assets.codepen.io/13471/ticket-shape.svg);
      --ar: 20/30;
      --gutter: 8%;
    }

    * { box-sizing: border-box; }

    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--bg);
      overflow: hidden;
      font-family: "Roboto Mono", monospace;
    }

    h1 {
      position: fixed;
      top: 20px;
      left: 0;
      right: 0;
      text-align: center;
      margin: 0;
      color: #fff;
      font-size: 24px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    #app {
      perspective: 1200px;
      --o: 0;
      --p: 100%;
      --h: 50%;
      --r: 0;
      color: black;
      display: grid;
      grid: 1fr / 1fr;
      place-content: center;
      padding: 28px 12px 12px;
      z-index: 2;
    }

    .ticket {
      --scale: 1;
      transform: translate3d(0, 0, 0.1px) scale(var(--scale)) rotateY(var(--r));
      transform-style: preserve-3d;
      pointer-events: auto;
      display: grid;
      grid-area: 1/1;
      width: min(440px, 96vw);
      aspect-ratio: var(--ar);
      position: relative;
    }

    .front,
    .back {
      grid-area: 1/1;
      background-color: #6e6176;
      background-image: radial-gradient(circle at var(--p) 50%, #fff 10%, transparent 100%);
      background-size: 100% 220vh;
      background-position: center;
      background-repeat: no-repeat;
      border-radius: 15px;
      display: grid;
      backface-visibility: visible;
      transform: translateZ(1px);
      transform-style: preserve-3d;
      -webkit-mask-image: var(--ticket);
      mask-image: var(--ticket);
      -webkit-mask-size: cover;
      mask-size: cover;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      position: relative;
      overflow: hidden;
    }

    .front::after,
    .back::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: linear-gradient(-70deg, transparent 40%, rgba(255, 255, 255, 0.5) 40.5%, transparent);
      background-size: 200% 200%;
      background-position: var(--p) var(--p);
      z-index: 5;
      opacity: calc(var(--o) + 0.5);
      pointer-events: none;
    }

    .front { display: none; }
    .back { transform: translateZ(1px); }

    .holo {
      display: block;
      position: absolute;
      inset: 0;
      border-radius: 15px;
      --space: 5%;
      --red: hsl(0, 100%, 50%);
      --orange: hsl(30, 100%, 50%);
      --yellow: hsl(60, 100%, 50%);
      --green: hsl(120, 100%, 50%);
      --cyan: hsl(180, 100%, 50%);
      --blue: hsl(222, 100%, 50%);
      --purple: hsl(258, 100%, 50%);
      --magenta: hsl(300, 100%, 50%);
      background-image: repeating-linear-gradient(-45deg, var(--red) 0%, var(--orange) calc(var(--space) * 1), var(--yellow) calc(var(--space) * 2), var(--green) calc(var(--space) * 3), var(--cyan) calc(var(--space) * 4), var(--blue) calc(var(--space) * 5), var(--purple) calc(var(--space) * 6), var(--magenta) calc(var(--space) * 7), var(--red) calc(var(--space) * 8));
      background-size: 150vw 150vh;
      background-position: calc(var(--h)) calc(var(--h));
      background-repeat: no-repeat;
      -webkit-mask-image: var(--logopng);
      mask-image: var(--logopng);
      -webkit-mask-size: 4% 4%;
      mask-size: 4% 4%;
      -webkit-mask-repeat: repeat;
      mask-repeat: repeat;
      mix-blend-mode: plus-lighter;
      filter: brightness(0.9) contrast(0.7) saturate(2);
      opacity: var(--o);
    }

    .logo,
    .data {
      position: relative;
      z-index: 2;
    }

    .logo {
      width: 50%;
      place-self: center;
      transform: translateY(-14%);
    }

    .back .logo {
      position: absolute;
      right: -1.5%;
      top: 9.5%;
      width: 40%;
      image-rendering: crisp-edges;
    }

    .data {
      margin: 14% var(--gutter);
      text-transform: uppercase;
    }

    h3 {
      font-size: 20px;
      font-weight: 400;
      line-height: 1;
      margin: 0.2em 0;
    }

    p {
      font-size: 32px;
      font-weight: 400;
      line-height: 1;
      margin: 0.2em 0 1em;
    }

    [contenteditable] { outline: none; }

    .qr {
      max-width: 30%;
      display: block;
      image-rendering: crisp-edges;
    }

    .divider {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: space-between;
      bottom: 2%;
      left: 0;
      right: 0;
      height: 18%;
      padding: 0 var(--gutter);
      background-image: repeating-linear-gradient(90deg, #fff0 0px, #fff0 8px, #0005 8px, #0005 16px), radial-gradient(ellipse at center center, #fff0 10%, transparent 50%);
      background-size: 100% 1.5px, 250% 1.5px;
      background-repeat: no-repeat;
      background-position: -4px top, var(--h) top;
      background-blend-mode: overlay;
      font-size: 16px;
      font-weight: 400;
      z-index: 2;
    }

    .username {
      display: flex;
      align-items: center;
      font-family: heebo, sans-serif;
      font-weight: 600;
    }

    .profile {
      border-radius: 100%;
      width: 40px;
      height: 40px;
      object-fit: cover;
      object-position: center;
      box-shadow: 0 0 0 1.33px black;
      margin-right: 10px;
      image-rendering: crisp-edges;
    }

    .verified {
      width: 18px;
      margin-left: 5px;
    }

    .usernum { font-size: 20px; }

    img { display: block; max-width: 100%; }

    @media screen and (max-width: 500px), screen and (max-height: 760px) {
      .ticket { --scale: 0.75; }
      .data { margin-top: 12%; }
    }
  </style>
</head>
<body>
  <h1>__PLAYGROUND_NAME__ TICKET</h1>

  <main id="app">
    <section class="ticket">
      <header class="front">
        <div class="holo"></div>
        <img class="logo" src="__TICKET_TOP_LOGO__" alt="Ticket logo">
        <aside class="divider"></aside>
      </header>

      <section class="back">
        <div class="holo"></div>
        <img class="logo" src="__TICKET_TOP_LOGO__" alt="Ticket logo">
        <div class="data">
          <h3>DATE</h3>
          <p contenteditable spellcheck="false">__PLAYGROUND_DATE__</p>
          <h3>SEASON</h3>
          <p contenteditable spellcheck="false">__PLAYGROUND_SEASON__</p>
          <h3>USERNAME</h3>
          <p contenteditable spellcheck="false">__TICKET_USERNAME__</p>
          <a class="qr" href="https://codepen.io/simeydotme" target="_blank" rel="noreferrer noopener">
            <img src="__TICKET_QR_IMAGE__" alt="Profile QR">
          </a>
        </div>

        <aside class="divider">
          <div class="username">
            <img class="profile" src="__TICKET_PROFILE_IMAGE__" alt="Profile">
            <span contenteditable spellcheck="false">__TICKET_HANDLE__</span>
          </div>
          <span class="usernum" contenteditable spellcheck="false">__TICKET_USERNUM__</span>
        </aside>
      </section>
    </section>
  </main>

</body>
</html>`;

interface PlaygroundJoinStatusResponse {
  data: {
    enrolled: boolean;
    playgroundId?: string;
    playgroundName?: string;
  };
}

const parseJsonOrThrow = async (res: Response) => {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    throw new Error('Invalid server response format');
  }

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Request failed with status ${res.status}`);
  }
  return body;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return parseJsonOrThrow(res);
};

const authFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  return parseJsonOrThrow(res);
};

interface PlaygroundProps {
  previewSettings?: PlaygroundSettings;
  seasonSlug?: string | null;
  isCurrentUserAdmin?: boolean;
  currentUser?: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toSeasonSlug = (value: string) => encodeURIComponent(value.trim());

const parseScheduleDate = (value?: string, dateOnlyMode: 'start' | 'end' = 'start') => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const suffix = dateOnlyMode === 'end' ? 'T23:59:59' : 'T00:00:00';
    const parsedDateOnly = new Date(`${trimmed}${suffix}`);
    return Number.isNaN(parsedDateOnly.getTime()) ? null : parsedDateOnly;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const Playground: NextPageWithLayout<PlaygroundProps> = ({ previewSettings, seasonSlug, currentUser, isCurrentUserAdmin = false }) => {
  const router = useRouter();
  const hardNavigatingRef = useRef(false);
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<'overview' | 'faq' | 'how-to-play'>('overview');
  const [joining, setJoining] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinModalMessage, setJoinModalMessage] = useState('참가 신청이 완료되었습니다.');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketTopLogo, setTicketTopLogo] = useState('/logo/hub-logo.PNG');
  const [ticketQrImage, setTicketQrImage] = useState('/playground_qr/test/frame.png');
  const { data, error, isLoading } = useSWR<PlaygroundLeaderboardResponse>('/api/rankings/playground', fetcher);
  const settingsApiUrl = seasonSlug
    ? `/api/playground/settings?season=${encodeURIComponent(seasonSlug)}`
    : '/api/playground/settings';
  const { data: settingsData } = useSWR<PlaygroundSettingsResponse>(
    previewSettings ? null : settingsApiUrl,
    fetcher
  );
  const { data: joinStatusData, mutate: mutateJoinStatus } = useSWR<PlaygroundJoinStatusResponse>(
    previewSettings ? null : '/api/playground/join',
    authFetcher
  );
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const rankings = data?.data?.rankings || [];
  const settings = previewSettings || settingsData?.data || {
    name: 'Recruiting Playground',
    codeName: 'BREEZY',
    season: 'MAR-JUN 2026',
    type: 'recruiting',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
  };
  const startDate = parseScheduleDate(settings.startDate, 'start');
  const endDate = parseScheduleDate(settings.endDate, 'end');
  const now = new Date();
  const isBeforeStart = startDate ? now < startDate : true;
  const isOngoing = !!(startDate && endDate && now >= startDate && now <= endDate);
  const isEnded = !!(endDate && now > endDate);
  // 종료 후 24시간 이내 여부
  let isWithin24hAfterEnd = false;
  if (endDate && now > endDate) {
    const diffMs = now.getTime() - endDate.getTime();
    isWithin24hAfterEnd = diffMs <= 24 * 60 * 60 * 1000;
  }
  const alreadyJoined = joinStatusData?.data?.enrolled === true;
  const ticketUserName = (currentUser?.name || 'Guest').trim();
  const ticketUserEmail = (currentUser?.email || '').trim();
  const ticketUserHandle = ticketUserName || 'guest';
  const ticketUserNum = (ticketUserEmail.includes('@') ? ticketUserEmail.split('@')[0] : ticketUserHandle).trim();
  const ticketProfileImage = currentUser?.image || 'https://assets.codepen.io/13471/internal/avatars/users/default.png';
  const seasonRouteSlug = settings.codeName
    ? toSeasonSlug(settings.codeName)
    : (settings.season ? toSeasonSlug(settings.season) : '');
  const seasonDisplayText = settings.season
    ? `${settings.type ? settings.type.toUpperCase() : 'RECRUITING'} PLAYGROUND ${settings.season}`
    : 'RECRUITING PLAYGROUND MAR-JUN 2026';
  const ticketDateText = startDate && !Number.isNaN(startDate.getTime())
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(startDate).toUpperCase()
    : 'TBD';
  const ticketSrcDoc = ticketPenSource
    .split('__PLAYGROUND_NAME__').join(escapeHtml(settings.name || 'Playground'))
    .split('__PLAYGROUND_DATE__').join(escapeHtml(ticketDateText))
    .split('__PLAYGROUND_SEASON__').join(escapeHtml(settings.codeName || settings.season || ''))
    .split('__TICKET_USERNAME__').join(escapeHtml(ticketUserName))
    .split('__TICKET_PROFILE_IMAGE__').join(escapeHtml(ticketProfileImage))
    .split('__TICKET_TOP_LOGO__').join(escapeHtml(ticketTopLogo))
    .split('__TICKET_QR_IMAGE__').join(escapeHtml(ticketQrImage))
    .split('__TICKET_HANDLE__').join(escapeHtml(ticketUserHandle))
    .split('__TICKET_USERNUM__').join(escapeHtml(ticketUserNum));

  // 상태 계산 (UPCOMING, 진행 중, 종료됨)
  const getStatus = () => {
    if (isEnded) return { text: '종료됨', color: 'text-destructive' };
    if (isOngoing) return { text: '진행 중', color: 'text-accent' };
    return { text: 'UPCOMING', color: 'text-foreground' };
  };

  const status = getStatus();

  useEffect(() => {
    let active = true;

    const toDataUrl = async (assetPath: string) => {
      const response = await fetch(assetPath, { credentials: 'same-origin' });
      if (!response.ok) {
        throw new Error('asset fetch failed');
      }

      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
            return;
          }
          reject(new Error('asset encode failed'));
        };
        reader.onerror = () => reject(new Error('asset encode failed'));
        reader.readAsDataURL(blob);
      });
    };

    const resolveTicketAssets = async () => {
      try {
        const [logoDataUrl, qrDataUrl] = await Promise.all([
          toDataUrl('/logo/hub-logo.PNG'),
          toDataUrl('/playground_qr/test/frame.png'),
        ]);

        if (active) {
          setTicketTopLogo(logoDataUrl);
          setTicketQrImage(qrDataUrl);
        }
      } catch {
        if (active) {
          setTicketTopLogo('/logo/hub-logo.PNG');
          setTicketQrImage('/playground_qr/test/frame.png');
        }
      }
    };

    resolveTicketAssets();

    return () => {
      active = false;
    };
  }, []);

  // 카운트다운 계산
  useEffect(() => {
    const targetDate = isOngoing
      ? (endDate ? endDate.getTime() : Date.now())
      : (startDate ? startDate.getTime() : Date.now());

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isOngoing, startDate, endDate]);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (hardNavigatingRef.current) {
        return;
      }

      if (url === router.asPath) {
        return;
      }

      hardNavigatingRef.current = true;
      window.location.assign(url);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [router]);

  // 사용자 이름의 이니셜 생성
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('en-US').format(points);
  };

  const handlePlaygroundJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/playground/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = json?.error?.message || '참가 신청에 실패했습니다.';
        if (res.status === 401) {
          toast.error('로그인이 필요합니다.');
          window.location.href = '/auth/login';
          return;
        }
        throw new Error(msg);
      }

      setJoinModalMessage(json?.data?.message || '참가 신청이 완료되었습니다.');
      setJoinModalOpen(true);
      mutateJoinStatus();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '참가 신청에 실패했습니다.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <div className={`relative ${previewSettings ? 'min-h-screen' : 'h-screen'} bg-background ${previewSettings ? '' : 'overflow-hidden'}`}>
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10 h-full">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="h-full flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Playground
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="w-full pt-4 px-6 md:px-12 pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="font-mono text-xs font-semibold text-foreground">{settings.name || 'Playground'}</h2>
                      <span className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${status.color === 'text-destructive' ? 'bg-destructive/20 text-destructive' : status.color === 'text-accent' ? 'bg-accent text-foreground' : 'bg-accent text-foreground'}`}>
                        {status.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`font-mono text-[10px] px-2.5 py-1 rounded border transition-colors ${activeTab === 'overview' ? 'bg-primary text-primary-foreground border-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50 hover:bg-muted/40'}`}
                      >
                        OVERVIEW
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('faq')}
                        className={`font-mono text-[10px] px-2.5 py-1 rounded border transition-colors ${activeTab === 'faq' ? 'bg-primary text-primary-foreground border-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50 hover:bg-muted/40'}`}
                      >
                        FAQ
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('how-to-play')}
                        className={`font-mono text-[10px] px-2.5 py-1 rounded border transition-colors ${activeTab === 'how-to-play' ? 'bg-primary text-primary-foreground border-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50 hover:bg-muted/40'}`}
                      >
                        HOW TO PLAY
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-destructive">
                      {settings.description || 'No description provided.'}
                    </div>
                  </div>
                </div>

                {activeTab === 'overview' && (
                  <>
                    {/* Main Hero Section */}
                    <section className="relative flex flex-col items-center justify-center px-6 md:px-12 pt-16 md:pt-20 pb-4 md:pb-6">
                      <div className="relative w-full max-w-6xl mx-auto text-center">
                        {/* Main Title */}
                        <div className="relative mb-4">
                          <h1 className="font-[var(--font-bebas)] text-7xl md:text-8xl tracking-tight text-foreground mb-2" style={{ fontStyle: 'italic' }}>
                            PLAYGROUND
                          </h1>
                          <p className="font-mono text-xs text-foreground/80">{settings.type ? settings.type.toUpperCase() : 'RECRUITING'} FOR PLAYGROUND</p>
                        </div>

                        {/* Status Messages */}
                        <div className="mb-4">
                          {isBeforeStart ? (
                            <>
                              <p className="font-mono text-sm text-foreground mb-1">
                                {settings.name || 'Playground'} 참가 신청 기간입니다.
                              </p>
                              <p className="font-mono text-xs text-foreground">
                                시작 전까지 참가 신청을 완료해주세요.
                              </p>
                            </>
                          ) : isOngoing ? (
                            <>
                              <p className="font-mono text-sm text-foreground mb-1">
                                {settings.name || 'Playground'} 진행 중입니다.
                              </p>
                              <p className="font-mono text-xs text-foreground">
                                종료 전까지 자유롭게 참여할 수 있습니다.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-mono text-sm text-foreground mb-1">
                                {settings.name || 'Playground'}가 종료되었습니다.
                              </p>
                              <p className="font-mono text-xs text-destructive">
                                이번 시즌 참여가 마감되었습니다.
                              </p>
                            </>
                          )}
                        </div>

                        {/* Background Circle Effect */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />
                      </div>
                    </section>

                    {/* Content Section */}
                    <section className="px-6 md:px-12 pt-8 md:pt-12 pb-4 md:pb-6">
                      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                        {/* Left Column - Countdown */}
                        <div>
                          <h2 className="font-[var(--font-bebas)] text-5xl md:text-6xl tracking-tight text-accent mb-2" style={{ fontStyle: 'italic', color: 'violet' }}>
                            {settings.codeName || 'BREEZY'}
                          </h2>
                          <p className="font-mono text-xs text-muted-foreground mb-3">
                            {seasonDisplayText}
                          </p>
                          <div className="font-mono text-xl md:text-2xl text-foreground">
                            <span>{timeLeft.days}D</span>{' '}
                            <span>{timeLeft.hours}H</span>{' '}
                            <span>{timeLeft.minutes}M</span>{' '}
                            <span>{timeLeft.seconds}S</span>
                          </div>
                        </div>

                        {/* Right Column - CTA */}
                        <div className="flex flex-col justify-center">
                          {!isEnded || alreadyJoined ? (
                            <>
                              <h3 className="font-mono text-sm text-foreground mb-2">
                                {alreadyJoined
                                  ? (isOngoing ? '현재 참가 중입니다.' : '이미 참가 신청이 완료되었습니다.')
                                  : (isOngoing
                                    ? `${settings.name || 'Playground'} 지금 참가하기`
                                    : `${settings.name || 'Playground'} 참가신청하기`)}
                              </h3>
                              <p className="font-mono text-xs text-muted-foreground mb-3">
                                {alreadyJoined
                                  ? (isOngoing ? '종료 전까지 문제를 풀고 점수를 올려보세요.' : '신청 내역이 확인되었습니다.')
                                  : (isOngoing ? '지금 바로 참여할 수 있습니다.' : '시작 전까지 참가 신청을 완료해주세요.')}
                              </p>
                              {!alreadyJoined && (
                                isCurrentUserAdmin ? (
                                  <Button
                                    type="button"
                                    onClick={() => setAdminPanelOpen(true)}
                                    className="font-mono text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground h-8"
                                  >
                                    Admin Panel
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    onClick={handlePlaygroundJoin}
                                    disabled={joining}
                                    className="font-mono text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground h-8"
                                  >
                                    {joining
                                      ? '신청 중...'
                                      : (isOngoing
                                        ? `${settings.name || 'Playground'} 참가하기`
                                        : `${settings.name || 'Playground'} 참가신청`)}
                                  </Button>
                                )
                              )}
                              {alreadyJoined && (
                                <div className="flex flex-col gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setTicketModalOpen(true)}
                                    className="font-mono text-[10px] uppercase tracking-wider h-8"
                                  >
                                    TICKET
                                  </Button>
                                  {isOngoing && (
                                    <Button
                                      asChild
                                      className="font-mono text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground h-8"
                                    >
                                      <a href={seasonRouteSlug ? `/playground-season/${seasonRouteSlug}` : '/playground'}>Go to {settings.name || 'Playground'}</a>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <h3 className="font-mono text-sm text-foreground mb-2">
                                이번 {settings.name || 'Playground'} 콘텐츠를 놓치셨나요?
                              </h3>
                              <p className="font-mono text-xs text-muted-foreground mb-3">
                                만약 놓치셨다면 PLAYGROUND Machine에서 경험할 수 있습니다!
                              </p>
                              {isWithin24hAfterEnd ? (
                                <Button asChild className="font-mono text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground h-8">
                                  <Link href={seasonRouteSlug ? `/playground-season/${seasonRouteSlug}` : '/playground'}>
                                    PLAYGROUND 접속
                                  </Link>
                                </Button>
                              ) : (
                                <Button asChild className="font-mono text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground h-8">
                                  <Link href="/arena/machine">
                                    PLAYGROUND MACHINES NOW
                                  </Link>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Leaderboard Section */}
                    <section className="px-6 md:px-12 py-4 md:py-6 pb-4">
                      <div className="max-w-6xl mx-auto">
                        <h2 className="font-mono text-lg text-foreground text-center mb-4 uppercase tracking-wider">
                          {settings.name || 'Recruiting Playground'} LEADERBOARD
                        </h2>

                        {isLoading ? (
                          <div className="border border-border/30 bg-background/50 backdrop-blur-sm rounded-lg p-6 text-center">
                            <p className="font-mono text-xs text-muted-foreground">Loading leaderboard...</p>
                          </div>
                        ) : error ? (
                          <div className="border border-border/30 bg-background/50 backdrop-blur-sm rounded-lg p-6 text-center">
                            <p className="font-mono text-xs text-destructive">리더보드를 불러오지 못했습니다</p>
                          </div>
                        ) : rankings.length === 0 ? (
                          <div className="border border-border/30 bg-background/50 backdrop-blur-sm rounded-lg p-6 text-center">
                            <p className="font-mono text-xs text-muted-foreground">No leaderboard data available</p>
                          </div>
                        ) : (
                          <div className="border border-border/30 bg-background/50 backdrop-blur-sm rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-border/20 bg-background/40">
                                    <th className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                                      Rank
                                    </th>
                                    <th className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                                      User
                                    </th>
                                    <th className="px-4 py-2 text-right font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                                      Points
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rankings.slice(0, 3).map((user, index) => {
                                    const rank = index + 1;

                                    return (
                                      <tr
                                        key={user.id}
                                        className="border-b border-border/10 transition-colors hover:bg-background/50"
                                      >
                                        <td className="px-4 py-2">
                                          <span className="font-mono text-xs font-semibold text-foreground">
                                            #{rank}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2">
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage src={user.image || undefined} alt={user.name} />
                                              <AvatarFallback className="bg-muted text-foreground font-mono text-[9px]">
                                                {getInitials(user.name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <p className="font-mono text-xs font-medium text-foreground">
                                                {user.name}
                                              </p>
                                              <p className="font-mono text-[10px] text-muted-foreground">
                                                {user.email}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          <p className="font-mono text-xs font-semibold text-foreground">
                                            {formatPoints(user.points)}
                                          </p>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {activeTab === 'faq' && (
                  <section className="px-6 md:px-12 pt-10 pb-8">
                    <div className="max-w-4xl mx-auto">
                      <h2 className="font-mono text-lg text-foreground mb-6 uppercase tracking-wider">FAQ</h2>
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5">
                          <p className="font-mono text-sm text-foreground mb-2">Q. Playground는 언제 시작되나요?</p>
                          <p className="font-mono text-xs text-muted-foreground">설정된 시작일 이후 자동으로 참여가 활성화됩니다.</p>
                        </div>
                        <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5">
                          <p className="font-mono text-sm text-foreground mb-2">Q. 점수는 어디서 확인하나요?</p>
                          <p className="font-mono text-xs text-muted-foreground">OVERVIEW 탭의 리더보드에서 실시간 순위를 확인할 수 있습니다.</p>
                        </div>
                        <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5">
                          <p className="font-mono text-sm text-foreground mb-2">Q. 종료된 Playground는 다시 참여 가능한가요?</p>
                          <p className="font-mono text-xs text-muted-foreground">종료 후에는 참여가 제한되며, 관련 콘텐츠는 머신 페이지에서 확인 가능합니다.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'how-to-play' && (
                  <section className="px-6 md:px-12 pt-10 pb-8">
                    <div className="max-w-4xl mx-auto">
                      <h2 className="font-mono text-lg text-foreground mb-6 uppercase tracking-wider">HOW TO PLAY</h2>
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5">
                          <p className="font-mono text-sm text-foreground mb-2">1. 등록 상태 확인</p>
                          <p className="font-mono text-xs text-muted-foreground">Playground가 시작 상태인지 확인하고 참여 가능한 기간에 접속하세요.</p>
                        </div>
                        <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5">
                          <p className="font-mono text-sm text-foreground mb-2">2. 문제 풀이 및 점수 획득</p>
                          <p className="font-mono text-xs text-muted-foreground">문제를 해결하면 점수가 누적되고 리더보드에 반영됩니다.</p>
                        </div>
                        <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-5">
                          <p className="font-mono text-sm text-foreground mb-2">3. 순위 확인</p>
                          <p className="font-mono text-xs text-muted-foreground">OVERVIEW 탭에서 본인의 현재 순위와 점수를 확인하세요.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              PLAYGROUND
            </DialogTitle>
            <DialogDescription className="font-mono text-sm text-foreground">
              {joinModalMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={adminPanelOpen} onOpenChange={setAdminPanelOpen}>
        <DialogContent className="border-border/30 bg-card/95 backdrop-blur-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              Admin Panel
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              원하는 관리 작업을 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Button asChild className="w-full justify-start font-mono text-xs uppercase tracking-wider">
              <Link href={seasonRouteSlug ? `/playground-season/${seasonRouteSlug}` : '/playground'}>
                1. PLAYGROUND 접속
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start font-mono text-xs uppercase tracking-wider">
              <Link href="/admin/playground">
                2. PLAYGROUND 설정
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start font-mono text-xs uppercase tracking-wider">
              <Link href="/admin/playground/challenges">
                3. PG CHALLENGE 설정
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="border-border/30 bg-card/95 backdrop-blur-sm max-w-[520px] w-[92vw] h-[68vh] p-0 overflow-hidden">
          <div className="h-full w-full">
            <iframe
              srcDoc={ticketSrcDoc}
              title="Ticket"
              className="w-full h-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-popups allow-forms"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const seasonSlug = typeof context.query.season === 'string' ? context.query.season : null;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      seasonSlug,
      isCurrentUserAdmin: user ? isAdmin(user.role) : false,
      currentUser: user
        ? {
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? null,
          }
        : null,
    },
  };
};

Playground.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Playground;
