import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Connection events from the OpenVPN server.
 *
 * Called by the server's client-connect / client-disconnect / keepalive hooks,
 * which run on the VPN host and have no session — so this authenticates with
 * the same shared key the CI test reporter uses.
 */
const clientSchema = z.object({
  /** Certificate common name, which is the user id. */
  commonName: z.string().min(1),
  virtualIp: z.string().optional().nullable(),
  bytesIn: z.coerce.number().int().nonnegative().optional(),
  bytesOut: z.coerce.number().int().nonnegative().optional(),
});

const eventSchema = z.discriminatedUnion('event', [
  clientSchema.extend({ event: z.literal('connect') }),
  clientSchema.extend({ event: z.literal('disconnect') }),
  /**
   * The full list of clients the server currently has up.
   *
   * client-connect fires once and client-disconnect can be skipped entirely —
   * a dropped link, a sleeping laptop or a killed daemon all leave no event. So
   * connection state cannot be maintained from those two alone: without a
   * refresh every genuinely-connected user ages out of the trust window, and
   * without a sweep a vanished one stays connected forever. This carries both,
   * because it says who is up rather than what just changed.
   */
  z.object({
    event: z.literal('sync'),
    clients: z.array(clientSchema),
  }),
]);

/**
 * Reconciles stored state against the server's live client list.
 *
 * Names not in the list are marked disconnected, so a missed disconnect hook
 * heals on the next sweep rather than leaving a tunnel that no longer exists.
 */
async function syncConnectedClients(
  clients: z.infer<typeof clientSchema>[]
): Promise<{ connected: number; disconnected: number; unknown: string[] }> {
  const now = new Date();
  const byName = new Map(clients.map((c) => [c.commonName, c]));

  const profiles = await prisma.vpnProfile.findMany({
    where: {
      OR: [{ commonName: { in: [...byName.keys()] } }, { connected: true }],
    },
  });

  const known = new Set(profiles.map((p) => p.commonName));
  const unknown = [...byName.keys()].filter((cn) => !known.has(cn));

  let connected = 0;
  let disconnected = 0;

  for (const profile of profiles) {
    const live = byName.get(profile.commonName);

    if (live && !profile.revokedAt) {
      await prisma.vpnProfile.update({
        where: { id: profile.id },
        data: {
          connected: true,
          virtualIp: live.virtualIp ?? profile.virtualIp,
          lastSeenAt: now,
          // Only stamped when the tunnel is newly up, so "connected for 2 hours"
          // does not reset to zero on every sweep.
          ...(profile.connected ? {} : { connectedAt: now }),
          ...(live.bytesIn !== undefined
            ? { bytesIn: BigInt(live.bytesIn) }
            : {}),
          ...(live.bytesOut !== undefined
            ? { bytesOut: BigInt(live.bytesOut) }
            : {}),
        },
      });
      connected += 1;
    } else if (profile.connected) {
      await prisma.vpnProfile.update({
        where: { id: profile.id },
        data: {
          connected: false,
          virtualIp: null,
          disconnectedAt: now,
          lastSeenAt: now,
        },
      });
      disconnected += 1;
    }
  }

  return { connected, disconnected, unknown };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res
        .status(405)
        .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const expectedKey = process.env.PLATFORM_API_KEY;
    if (!expectedKey || req.headers['x-api-key'] !== expectedKey) {
      throw new ApiError(401, 'Invalid API key');
    }

    const body = eventSchema.parse(req.body);

    if (body.event === 'sync') {
      const result = await syncConnectedClients(body.clients);
      return res.json({ data: result });
    }

    // The CN is the user id, but a certificate outliving its account is exactly
    // the case worth failing loudly on rather than creating a stray row.
    const profile = await prisma.vpnProfile.findUnique({
      where: { commonName: body.commonName },
    });

    if (!profile) {
      throw new ApiError(404, 'No VPN profile for that common name');
    }

    if (profile.revokedAt) {
      throw new ApiError(403, 'This VPN profile has been revoked');
    }

    const now = new Date();

    if (body.event === 'disconnect') {
      await prisma.vpnProfile.update({
        where: { id: profile.id },
        data: {
          connected: false,
          virtualIp: null,
          disconnectedAt: now,
          lastSeenAt: now,
          ...(body.bytesIn !== undefined
            ? { bytesIn: BigInt(body.bytesIn) }
            : {}),
          ...(body.bytesOut !== undefined
            ? { bytesOut: BigInt(body.bytesOut) }
            : {}),
        },
      });
    } else {
      await prisma.vpnProfile.update({
        where: { id: profile.id },
        data: {
          connected: true,
          virtualIp: body.virtualIp ?? profile.virtualIp,
          lastSeenAt: now,
          // A ping is a heartbeat on an existing tunnel, so it must not reset
          // the moment the session began.
          ...(body.event === 'connect' ? { connectedAt: now } : {}),
        },
      });
    }

    return res.json({ data: { ok: true } });
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
