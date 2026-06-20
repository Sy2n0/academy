import { useState, useEffect } from 'react';
import { AnimatedNoise } from '@/components/animated-noise';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PlaygroundSettings {
  name: string;
  codeName: string;
  season: string;
  type: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface PlaygroundPreviewProps {
  settings: PlaygroundSettings;
}

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

export function PlaygroundPreview({ settings }: PlaygroundPreviewProps) {
  const { data } = useSWR<PlaygroundLeaderboardResponse>(
    '/api/rankings/playground',
    fetcher
  );
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const rankings = data?.data?.rankings || [];

  // 상태 계산
  const getStatus = () => {
    const now = new Date();
    const start = parseScheduleDate(settings.startDate, 'start');
    const end = parseScheduleDate(settings.endDate, 'end');

    if (end && now > end) return { text: '종료됨', color: 'text-destructive' };
    if (start && now >= start && end && now <= end)
      return { text: '진행 중', color: 'text-accent' };
    return { text: 'UPCOMING', color: 'text-foreground' };
  };

  const status = getStatus();

  // 카운트다운 계산
  useEffect(() => {
    const parsedStartDate = parseScheduleDate(settings.startDate, 'start');
    const targetDate = parsedStartDate
      ? parsedStartDate.getTime()
      : new Date('2026-03-01T00:00:00').getTime();

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
  }, [settings.startDate]);

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

  return (
    <div className="relative min-h-screen bg-background">
      <AnimatedNoise opacity={0.03} />
      <div className="relative z-10">
        {/* Header */}
        <div className="w-full pt-4 px-6 md:px-12 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs font-semibold text-foreground">
                {settings.name || 'Playground'}
              </h2>
              <span
                className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${status.color === 'text-destructive' ? 'bg-destructive/20 text-destructive' : status.color === 'text-accent' ? 'bg-accent text-foreground' : 'bg-accent text-foreground'}`}
              >
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {/* Main Hero Section */}
        <section className="relative flex flex-col items-center justify-center px-6 md:px-12 pt-16 md:pt-20 pb-4 md:pb-6">
          <div className="relative w-full max-w-6xl mx-auto text-center">
            <div className="relative mb-4">
              <h1
                className="font-[var(--font-bebas)] text-7xl md:text-8xl tracking-tight text-foreground mb-2"
                style={{ fontStyle: 'italic' }}
              >
                PLAYGROUND
              </h1>
              <p className="font-mono text-xs text-foreground/80">
                {settings.type ? settings.type.toUpperCase() : 'RECRUITING'} FOR
                PLAYGROUND
              </p>
            </div>

            <div className="mb-4">
              <p className="font-mono text-sm text-foreground mb-1">
                {settings.name || 'Playground'}는 아직 시작되지 않았습니다.
              </p>
              <p className="font-mono text-xs text-destructive">
                아직 참여할 수 없습니다.
              </p>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />
          </div>
        </section>

        {/* Content Section */}
        <section className="px-6 md:px-12 pt-8 md:pt-12 pb-4 md:pb-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
            <div>
              <h2
                className="font-[var(--font-bebas)] text-5xl md:text-6xl tracking-tight text-accent mb-2"
                style={{ fontStyle: 'italic' }}
              >
                {settings.codeName || 'BREEZY'}
              </h2>
              <p className="font-mono text-xs text-muted-foreground mb-3">
                {settings.season
                  ? `${settings.type ? settings.type.toUpperCase() : 'RECRUITING'} PLAYGROUND ${settings.season}`
                  : 'RECRUITING PLAYGROUND MAR-JUN 2026'}
              </p>
              <div className="font-mono text-xl md:text-2xl text-foreground">
                <span>{timeLeft.days}D</span> <span>{timeLeft.hours}H</span>{' '}
                <span>{timeLeft.minutes}M</span>{' '}
                <span>{timeLeft.seconds}S</span>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="font-mono text-sm text-foreground mb-2">
                이번 Playground 콘텐츠를 놓치셨나요?
              </h3>
              <p className="font-mono text-xs text-muted-foreground mb-3">
                만약 놓치셨다면 PLAYGROUND Machine에서 경험할 수 있습니다!
              </p>
              <Button
                asChild
                className="font-mono text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground h-8"
              >
                <Link href="/arena/machine">PLAYGROUND MACHINES NOW</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="px-6 md:px-12 py-4 md:py-6 pb-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-mono text-lg text-foreground text-center mb-4 uppercase tracking-wider">
              {settings.name || 'Recruiting Playground'} LEADERBOARD
            </h2>

            {rankings.length === 0 ? (
              <div className="border border-border/30 bg-background/50 backdrop-blur-sm rounded-lg p-6 text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  No leaderboard data available
                </p>
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
                      {rankings.slice(0, 10).map((user, index) => {
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
                                  <AvatarImage
                                    src={user.image || undefined}
                                    alt={user.name}
                                  />
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
      </div>
    </div>
  );
}
