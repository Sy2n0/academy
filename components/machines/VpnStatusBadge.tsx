import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type VpnStatus = {
  data: {
    enrolled: boolean;
    connected: boolean;
    virtualIp: string | null;
    connectedAt: string | null;
    lastSeenAt: string | null;
    bytesIn: number;
    bytesOut: number;
    stale: boolean;
    required: boolean;
    serverReady: boolean;
    routedSubnet: string;
  };
};

const formatBytes = (n: number) => {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    Math.floor(Math.log(n) / Math.log(1024)),
    units.length - 1
  );
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Elapsed time, recomputed on the client so it does not freeze on the value SWR fetched. */
function useElapsed(since: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);

  if (!since) return null;
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분 ${s % 60}초`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="warp-num min-w-0 truncate text-[11px] text-foreground">
        {value}
      </span>
    </div>
  );
}

/**
 * Tunnel state in the top bar.
 *
 * Shares its SWR key with the machine page's panel, so the two render the same
 * state off one request rather than polling separately. Always rendered,
 * including before the status arrives, so the bar does not reflow.
 */
export function VpnStatusBadge() {
  const { data } = useSWR<VpnStatus>('/api/vpn/status', fetcher, {
    refreshInterval: 15_000,
  });

  const state = data?.data;
  const connected = state?.connected ?? false;
  const elapsed = useElapsed(connected ? (state?.connectedAt ?? null) : null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground data-[state=open]:bg-[var(--warp-veil)]"
          aria-label={connected ? 'VPN connected' : 'VPN disconnected'}
        >
          {/* A filled dot for up, a hollow ring for down — legible without
              relying on hue, which the palette does not carry. */}
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              connected
                ? 'bg-[var(--warp-parchment)]'
                : 'border border-[var(--warp-stone)]'
            }`}
          />
          VPN
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-md border-[var(--warp-rule)] bg-[var(--warp-surface)] p-0"
      >
        <div className="border-b border-[var(--warp-rule)] px-3 py-2.5">
          <p className="text-sm text-foreground">
            {!state
              ? 'VPN 상태 확인 중'
              : connected
                ? 'VPN 연결됨'
                : 'VPN 연결 안 됨'}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {connected
              ? '머신 주소에 접속할 수 있습니다'
              : state?.stale
                ? '연결이 정상적으로 종료되지 않았습니다'
                : state?.required
                  ? '머신 접속에는 VPN이 필요합니다'
                  : '연결하면 머신 주소가 열립니다'}
          </p>
        </div>

        {connected && (
          <div className="border-b border-[var(--warp-rule)] px-3 py-2">
            <Row label="주소" value={state?.virtualIp ?? '—'} />
            <Row label="연결 시간" value={elapsed ?? '—'} />
            <Row
              label="송수신"
              value={`↓ ${formatBytes(state?.bytesIn ?? 0)} · ↑ ${formatBytes(
                state?.bytesOut ?? 0
              )}`}
            />
          </div>
        )}

        {/* Stated because it is the question students ask first: connecting does
            not take over their internet. Only this range goes through the
            tunnel — the server pushes no default gateway. */}
        <div className="px-3 py-2">
          <Row label="라우팅" value={state?.routedSubnet ?? '—'} />
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            이 대역만 VPN을 지나갑니다. 인터넷 등 나머지 트래픽은 평소 경로를
            그대로 씁니다.
          </p>
        </div>

        {!connected && (
          <div className="border-t border-[var(--warp-rule)] p-2">
            {state?.serverReady ? (
              <a
                href="/api/vpn/config"
                download
                className="inline-flex w-full items-center justify-center gap-2 rounded border border-[var(--warp-rule)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                {state.enrolled ? '.ovpn 다시 받기' : '.ovpn 받기'}
              </a>
            ) : (
              <p className="px-1 py-0.5 text-[11px] text-muted-foreground">
                VPN 서버가 아직 준비되지 않았습니다.
              </p>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
