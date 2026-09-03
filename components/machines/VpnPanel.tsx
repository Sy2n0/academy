import useSWR from 'swr';
import { Download, ShieldCheck, ShieldOff } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type VpnStatus = {
  data: {
    enrolled: boolean;
    connected: boolean;
    virtualIp: string | null;
    connectedAt: string | null;
    stale: boolean;
    required: boolean;
    serverReady: boolean;
    routedSubnet: string;
  };
};

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded border border-[var(--warp-rule)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground';

/**
 * Tunnel state, and the one file needed to establish it.
 *
 * Machines sit on a network with no route from the public side, so this is the
 * difference between a reachable address and a dead one. It polls rather than
 * waiting for a page load because the state changes outside the browser — the
 * student connects in their VPN client, then comes back here.
 */
export function VpnPanel() {
  const { data } = useSWR<VpnStatus>('/api/vpn/status', fetcher, {
    refreshInterval: 10_000,
  });

  const state = data?.data;
  const connected = state?.connected ?? false;

  return (
    <div className="rounded-md border border-[var(--warp-rule)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {connected ? (
            <ShieldCheck className="h-4 w-4 text-foreground" />
          ) : (
            <ShieldOff className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm text-foreground">
              {connected ? 'VPN 연결됨' : 'VPN 연결 안 됨'}
            </p>
            <p className="warp-num mt-0.5 text-[11px] text-muted-foreground">
              {connected && state?.virtualIp
                ? state.virtualIp
                : state?.required
                  ? '머신에 접속하려면 VPN이 필요합니다'
                  : '연결하면 머신 주소가 열립니다'}
            </p>
          </div>
        </div>

        {state?.serverReady ? (
          <a href="/api/vpn/config" className={buttonClass} download>
            <Download className="h-3 w-3" />
            .ovpn
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            VPN 서버 준비 중
          </span>
        )}
      </div>

      {/* Shown only when the tunnel was never torn down cleanly — the row still
          says connected but the server has stopped confirming it. */}
      {state?.stale && (
        <p className="mt-3 border-t border-[var(--warp-rule)] pt-3 text-[11px] leading-relaxed text-muted-foreground">
          마지막 연결이 정상적으로 종료되지 않았습니다. VPN 클라이언트에서 다시
          연결해 주세요.
        </p>
      )}

      <p className="warp-num mt-3 border-t border-[var(--warp-rule)] pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {state?.routedSubnet ?? '—'}{' '}
        <span className="font-[inherit]">
          대역만 VPN을 지나갑니다. 인터넷은 평소 경로 그대로입니다.
        </span>
      </p>

      {!connected && state?.serverReady && (
        <ol className="mt-3 space-y-1.5 border-t border-[var(--warp-rule)] pt-3 text-[11px] leading-relaxed text-muted-foreground">
          <li>1. .ovpn 파일을 내려받습니다.</li>
          <li>
            2. OpenVPN 클라이언트에서 불러옵니다 (macOS: Tunnelblick, Windows:
            OpenVPN GUI, Linux:{' '}
            <code className="warp-num">openvpn --config</code>
            ).
          </li>
          <li>3. 연결하면 이 표시가 바뀌고 머신 주소가 열립니다.</li>
        </ol>
      )}
    </div>
  );
}
