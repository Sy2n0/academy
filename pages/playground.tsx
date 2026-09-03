import { type ReactElement, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useRouter } from 'next/router';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    throw new Error(
      body?.error?.message || `Request failed with status ${res.status}`
    );
  }
  return body;
};

const pgButton =
  'inline-flex items-center justify-center rounded border border-[var(--warp-rule)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

const pgButtonPrimary =
  'inline-flex items-center justify-center rounded border border-foreground/25 bg-[var(--warp-veil)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-40';

/** Static copy the two secondary tabs render; it was three pasted cards each. */
const FAQ: [string, string][] = [
  [
    'Playground는 언제 시작되나요?',
    '설정된 시작일 이후 자동으로 참여가 활성화됩니다.',
  ],
  [
    '점수는 어디서 확인하나요?',
    'Overview 탭의 리더보드에서 실시간 순위를 확인할 수 있습니다.',
  ],
  [
    '종료된 Playground는 다시 참여할 수 있나요?',
    '종료 후에는 참여가 제한되며, 관련 콘텐츠는 머신 페이지에서 확인할 수 있습니다.',
  ],
];

const HOW_TO_PLAY: [string, string][] = [
  [
    '등록 상태 확인',
    'Playground가 시작 상태인지 확인하고 참여 가능한 기간에 접속하세요.',
  ],
  [
    '문제 풀이 및 점수 획득',
    '문제를 해결하면 점수가 누적되고 리더보드에 반영됩니다.',
  ],
  ['순위 확인', 'Overview 탭에서 본인의 현재 순위와 점수를 확인하세요.'],
];

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

const parseScheduleDate = (
  value?: string,
  dateOnlyMode: 'start' | 'end' = 'start'
) => {
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

const Playground: NextPageWithLayout<PlaygroundProps> = ({
  previewSettings,
  seasonSlug,
  currentUser,
  isCurrentUserAdmin = false,
}) => {
  const router = useRouter();
  const hardNavigatingRef = useRef(false);
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'faq' | 'how-to-play'
  >('overview');
  const [joining, setJoining] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinModalMessage, setJoinModalMessage] =
    useState('참가 신청이 완료되었습니다.');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketTopLogo, setTicketTopLogo] = useState('/logo/hub-logo.PNG');
  const [ticketQrImage, setTicketQrImage] = useState(
    '/playground_qr/test/frame.png'
  );
  const settingsApiUrl = seasonSlug
    ? `/api/playground/settings?season=${encodeURIComponent(seasonSlug)}`
    : '/api/playground/settings';
  const { data: settingsData } = useSWR<PlaygroundSettingsResponse>(
    previewSettings ? null : settingsApiUrl,
    fetcher
  );
  const { data: joinStatusData, mutate: mutateJoinStatus } =
    useSWR<PlaygroundJoinStatusResponse>(
      previewSettings ? null : '/api/playground/join',
      authFetcher
    );
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const settings = previewSettings ||
    settingsData?.data || {
      name: 'Recruiting Playground',
      codeName: 'BREEZY',
      season: 'MAR-JUN 2026',
      type: 'recruiting',
      startDate: '2026-03-01',
      endDate: '2026-06-30',
    };

  // Scoped to the season on screen. Without the parameter the board summed
  // every season that had ever run, so a new one opened with the previous
  // standings already on it.
  const { data, error, isLoading } = useSWR<PlaygroundLeaderboardResponse>(
    settings.codeName
      ? `/api/rankings/playground?season=${encodeURIComponent(settings.codeName)}`
      : null,
    fetcher
  );
  const rankings = data?.data?.rankings || [];
  const startDate = parseScheduleDate(settings.startDate, 'start');
  const endDate = parseScheduleDate(settings.endDate, 'end');
  const now = new Date();
  const isBeforeStart = startDate ? now < startDate : true;
  const isOngoing = !!(
    startDate &&
    endDate &&
    now >= startDate &&
    now <= endDate
  );
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
  const ticketUserNum = (
    ticketUserEmail.includes('@')
      ? ticketUserEmail.split('@')[0]
      : ticketUserHandle
  ).trim();
  const ticketProfileImage =
    currentUser?.image ||
    'https://assets.codepen.io/13471/internal/avatars/users/default.png';
  const seasonRouteSlug = settings.codeName
    ? toSeasonSlug(settings.codeName)
    : settings.season
      ? toSeasonSlug(settings.season)
      : '';
  const seasonDisplayText = settings.season
    ? `${settings.type ? settings.type.toUpperCase() : 'RECRUITING'} PLAYGROUND ${settings.season}`
    : 'RECRUITING PLAYGROUND MAR-JUN 2026';
  const ticketDateText =
    startDate && !Number.isNaN(startDate.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
          .format(startDate)
          .toUpperCase()
      : 'TBD';
  const ticketSrcDoc = ticketPenSource
    .split('__PLAYGROUND_NAME__')
    .join(escapeHtml(settings.name || 'Playground'))
    .split('__PLAYGROUND_DATE__')
    .join(escapeHtml(ticketDateText))
    .split('__PLAYGROUND_SEASON__')
    .join(escapeHtml(settings.codeName || settings.season || ''))
    .split('__TICKET_USERNAME__')
    .join(escapeHtml(ticketUserName))
    .split('__TICKET_PROFILE_IMAGE__')
    .join(escapeHtml(ticketProfileImage))
    .split('__TICKET_TOP_LOGO__')
    .join(escapeHtml(ticketTopLogo))
    .split('__TICKET_QR_IMAGE__')
    .join(escapeHtml(ticketQrImage))
    .split('__TICKET_HANDLE__')
    .join(escapeHtml(ticketUserHandle))
    .split('__TICKET_USERNUM__')
    .join(escapeHtml(ticketUserNum));

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
      ? endDate
        ? endDate.getTime()
        : Date.now()
      : startDate
        ? startDate.getTime()
        : Date.now();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          ),
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

      <div
        className={`${previewSettings ? 'min-h-svh' : 'h-svh overflow-hidden'} bg-background`}
      >
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
            <AppTopBar crumbs={[{ label: 'Playground' }]} />

            <div
              className={
                previewSettings
                  ? 'flex-1 overflow-y-auto'
                  : 'flex min-h-0 flex-1 flex-col'
              }
            >
              <div
                className={`mx-auto w-full max-w-[1100px] px-5 pb-5 pt-5 md:px-10 md:pb-6 md:pt-6 ${
                  previewSettings ? '' : 'flex min-h-0 flex-1 flex-col'
                }`}
              >
                <header className="grid shrink-0 gap-6 border-b border-[var(--warp-rule)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {status.text}
                    </p>
                    <h1 className="warp-display mt-2 max-w-[14ch]">
                      {settings.name || 'Playground'}
                    </h1>
                    {settings.codeName && (
                      <p className="warp-heading mt-1 text-[var(--warp-stone)]">
                        {settings.codeName}
                      </p>
                    )}
                    {/* The description used to render in `destructive` — the
                        warning colour — for no reason but that it was at hand. */}
                    {settings.description && (
                      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        {settings.description}
                      </p>
                    )}
                  </div>

                  {/* The live element of an event page, so it keeps its size —
                      it sits beside the title rather than under it so the fold
                      is spent on the leaderboard. */}
                  <div className="shrink-0">
                    <dl className="flex gap-x-8">
                      {(
                        [
                          ['Days', timeLeft.days],
                          ['Hours', timeLeft.hours],
                          ['Min', timeLeft.minutes],
                          ['Sec', timeLeft.seconds],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label}>
                          <dd className="warp-num text-3xl tracking-tight text-foreground md:text-4xl">
                            {String(value).padStart(2, '0')}
                          </dd>
                          <dt className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {label}
                          </dt>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {seasonDisplayText}
                    </p>
                  </div>
                </header>

                <nav className="mt-5 flex shrink-0 gap-6 border-b border-[var(--warp-rule)]">
                  {(
                    [
                      ['overview', 'Overview'],
                      ['faq', 'FAQ'],
                      ['how-to-play', 'How to play'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`-mb-px border-b px-0.5 pb-2.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                        activeTab === key
                          ? 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>

                {activeTab === 'overview' && (
                  <section className="mt-6 grid min-h-0 flex-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
                    <div className="flex min-h-0 min-w-0 flex-col">
                      <h2 className="shrink-0 border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Leaderboard
                      </h2>

                      {isLoading ? (
                        <p className="py-8 text-sm text-muted-foreground">
                          불러오는 중...
                        </p>
                      ) : error ? (
                        <p className="py-8 text-sm text-destructive">
                          리더보드를 불러오지 못했습니다.
                        </p>
                      ) : rankings.length === 0 ? (
                        <p className="py-8 text-sm text-muted-foreground">
                          아직 순위가 없습니다.
                        </p>
                      ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                            {rankings.map((user, index) => (
                              <li
                                key={user.id}
                                className="flex items-center gap-3 border-b border-[var(--warp-rule)] py-2.5"
                              >
                                {/* Rank is ordinal, so it rides the
                                      brightness ramp rather than a colour. */}
                                <span
                                  className={`warp-num w-8 shrink-0 text-sm ${
                                    index === 0
                                      ? 'text-foreground'
                                      : index < 3
                                        ? 'text-[var(--warp-ash)]'
                                        : 'text-muted-foreground'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage
                                    src={user.image || undefined}
                                    alt={user.name}
                                  />
                                  <AvatarFallback className="bg-[var(--warp-veil)] text-[9px] text-foreground">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                  {user.name}
                                </span>
                                <span className="warp-num shrink-0 text-sm text-foreground">
                                  {formatPoints(user.points)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {/* The table this replaces was capped at
                                rankings.slice(0, 3) with nothing linking
                                onwards, so a leaderboard of any size showed
                                three rows and stopped. */}
                          <p className="shrink-0 pt-3 text-xs text-muted-foreground">
                            {rankings.length}명
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {alreadyJoined ? 'Your entry' : 'Join'}
                      </h2>
                      <div className="pt-4">
                        {!isEnded || alreadyJoined ? (
                          <>
                            <p className="text-sm text-foreground">
                              {alreadyJoined
                                ? isOngoing
                                  ? '현재 참가 중입니다.'
                                  : '참가 신청이 완료되었습니다.'
                                : isOngoing
                                  ? '지금 참가할 수 있습니다.'
                                  : '시작 전까지 참가 신청을 완료해주세요.'}
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              {alreadyJoined
                                ? isOngoing
                                  ? '종료 전까지 문제를 풀고 점수를 올려보세요.'
                                  : '신청 내역이 확인되었습니다.'
                                : isOngoing
                                  ? '참여 즉시 점수가 반영됩니다.'
                                  : '시작 시각에 자동으로 열립니다.'}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                              {!alreadyJoined &&
                                (isCurrentUserAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => setAdminPanelOpen(true)}
                                    className={pgButtonPrimary}
                                  >
                                    Admin panel
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handlePlaygroundJoin}
                                    disabled={joining}
                                    className={pgButtonPrimary}
                                  >
                                    {joining ? '신청 중...' : '참가 신청'}
                                  </button>
                                ))}
                              {alreadyJoined && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setTicketModalOpen(true)}
                                    className={pgButton}
                                  >
                                    Ticket
                                  </button>
                                  {isOngoing && (
                                    <Link
                                      href={
                                        seasonRouteSlug
                                          ? `/playground-season/${seasonRouteSlug}`
                                          : '/playground'
                                      }
                                      className={pgButtonPrimary}
                                    >
                                      Enter
                                    </Link>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-foreground">
                              이번 시즌은 종료되었습니다.
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              놓치셨다면 Playground Machine에서 같은 문제를
                              경험할 수 있습니다.
                            </p>
                            <div className="mt-5">
                              <Link
                                href={
                                  isWithin24hAfterEnd && seasonRouteSlug
                                    ? `/playground-season/${seasonRouteSlug}`
                                    : '/arena/machine'
                                }
                                className={pgButtonPrimary}
                              >
                                {isWithin24hAfterEnd
                                  ? 'Playground 접속'
                                  : 'Machines'}
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'faq' && (
                  <dl className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--warp-rule)] pr-1">
                    {FAQ.map(([q, a]) => (
                      <div
                        key={q}
                        className="border-b border-[var(--warp-rule)] py-4"
                      >
                        <dt className="text-sm text-foreground">{q}</dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {a}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {activeTab === 'how-to-play' && (
                  <ol className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--warp-rule)] pr-1">
                    {HOW_TO_PLAY.map(([title, detail], i) => (
                      <li
                        key={title}
                        className="flex gap-4 border-b border-[var(--warp-rule)] py-4"
                      >
                        <span className="warp-num shrink-0 text-sm text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">{title}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              PLAYGROUND
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground">
              {joinModalMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={adminPanelOpen} onOpenChange={setAdminPanelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Admin Panel
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              원하는 관리 작업을 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Link
              href={
                seasonRouteSlug
                  ? `/playground-season/${seasonRouteSlug}`
                  : '/playground'
              }
              className={`${pgButtonPrimary} w-full justify-start`}
            >
              Playground 접속
            </Link>
            <Link
              href="/admin/playground"
              className={`${pgButton} w-full justify-start`}
            >
              Playground 설정
            </Link>
            <Link
              href="/admin/playground/challenges"
              className={`${pgButton} w-full justify-start`}
            >
              Challenge 설정
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="h-[68vh] w-[92vw] max-w-[520px] overflow-hidden p-0">
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
  const seasonSlug =
    typeof context.query.season === 'string' ? context.query.season : null;
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
