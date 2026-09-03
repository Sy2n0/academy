import { prisma } from '@/lib/prisma';

/**
 * VPN gating.
 *
 * Machine containers sit on a network that is only routable from inside the
 * tunnel, so the check here is not the security boundary — the network is. What
 * this adds is an honest answer before the student burns a container slot on a
 * machine they would not be able to reach, and a place to tell them why.
 */

/**
 * How long a "connected" row is trusted without a further hook.
 *
 * The server sends client-disconnect on a clean teardown, but a dropped link,
 * a killed daemon or a lost network can all skip it — leaving a row that claims
 * a tunnel that is gone. OpenVPN is configured to re-announce on its keepalive,
 * so anything older than this window is treated as stale rather than connected.
 */
export const VPN_STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * The address range clients are told to send through the tunnel.
 *
 * Only the machine subnet is routed: the server is generated with
 * `ovpn_genconfig -d`, so it never pushes a default gateway and the student's
 * ordinary internet keeps its own path while connected.
 */
export function routedSubnet(): string {
  return process.env.VPN_ROUTED_SUBNET || '10.10.10.0/24';
}

export type VpnState = {
  /** A profile row exists, so the user has been issued (or can be issued) a cert. */
  enrolled: boolean;
  connected: boolean;
  virtualIp: string | null;
  connectedAt: string | null;
  lastSeenAt: string | null;
  /** Traffic counters, as last reported by the server. */
  bytesIn: number;
  bytesOut: number;
  /** True when the row still says connected but no hook has been heard recently. */
  stale: boolean;
  /** The range routed through the tunnel. Everything else keeps its own path. */
  routedSubnet: string;
};

export async function getVpnState(userId: string): Promise<VpnState> {
  const profile = await prisma.vpnProfile.findUnique({ where: { userId } });

  if (!profile || profile.revokedAt) {
    return {
      enrolled: false,
      connected: false,
      virtualIp: null,
      connectedAt: null,
      lastSeenAt: null,
      bytesIn: 0,
      bytesOut: 0,
      stale: false,
      routedSubnet: routedSubnet(),
    };
  }

  const lastSeen = profile.lastSeenAt ?? profile.connectedAt;
  const stale =
    profile.connected &&
    (!lastSeen || Date.now() - lastSeen.getTime() > VPN_STALE_AFTER_MS);

  return {
    enrolled: Boolean(profile.issuedAt),
    connected: profile.connected && !stale,
    virtualIp: stale ? null : profile.virtualIp,
    connectedAt: profile.connectedAt?.toISOString() ?? null,
    lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
    // BigInt does not survive JSON, and these are byte counts a Number holds
    // exactly well past any plausible session.
    bytesIn: Number(profile.bytesIn),
    bytesOut: Number(profile.bytesOut),
    stale,
    routedSubnet: routedSubnet(),
  };
}

/** True when the user may reach the machine network right now. */
export async function isVpnConnected(userId: string): Promise<boolean> {
  const { connected } = await getVpnState(userId);
  return connected;
}

/**
 * Whether the gate is switched on.
 *
 * Off by default: until an OpenVPN server is actually running, refusing every
 * machine would lock the platform rather than protect it. Production sets this
 * once the tunnel is in place.
 */
export function isVpnRequired(): boolean {
  return process.env.VPN_REQUIRED === 'true';
}
