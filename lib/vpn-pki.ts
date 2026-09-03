import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

const execAsync = promisify(exec);

/**
 * Client certificate issuing, done by driving easy-rsa inside the OpenVPN
 * container rather than reimplementing a CA here.
 *
 * The container owns the CA key; this process never sees it. We ask for a
 * client bundle by common name and hand the result to the user once.
 */
const CONTAINER = process.env.OPENVPN_CONTAINER || 'hub-academy-openvpn-1';

/**
 * The CN goes into a shell command, so it is constrained to a character set
 * that cannot carry one. User ids are UUIDs and already satisfy this; the check
 * is here so that stays true if the id scheme ever changes.
 */
const SAFE_CN = /^[A-Za-z0-9_-]{1,64}$/;

async function inContainer(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker exec ${CONTAINER} sh -c ${JSON.stringify(command)}`,
      { maxBuffer: 1024 * 1024 * 4 }
    );
    return stdout;
  } catch (error: any) {
    // Before the server is provisioned this is the failure everyone hits, and
    // docker's own wording ("No such container") reaches the browser as a dead
    // download with no explanation. Name the actual cause.
    const detail = String(error?.stderr || error?.message || '');
    if (/No such container|Cannot connect to the Docker daemon/i.test(detail)) {
      throw new ApiError(
        503,
        'VPN 서버가 아직 준비되지 않았습니다. 관리자에게 문의하세요.'
      );
    }
    throw new ApiError(
      500,
      `VPN 인증서 발급에 실패했습니다: ${detail.slice(0, 200)}`
    );
  }
}

/** Whether the OpenVPN container is up, so callers can offer the download or not. */
export async function isVpnServerReady(): Promise<boolean> {
  try {
    await execAsync(`docker inspect -f '{{.State.Running}}' ${CONTAINER}`);
    return true;
  } catch {
    return false;
  }
}

/** Issues a certificate for this user if they do not have one yet. */
export async function ensureClientCertificate(userId: string): Promise<string> {
  if (!SAFE_CN.test(userId)) {
    throw new ApiError(500, 'User id is not usable as a certificate name');
  }

  const existing = await prisma.vpnProfile.findUnique({ where: { userId } });

  if (existing?.revokedAt) {
    throw new ApiError(403, 'Your VPN access has been revoked');
  }

  if (existing?.issuedAt) return existing.commonName;

  const profile =
    existing ??
    (await prisma.vpnProfile.create({
      data: { userId, commonName: userId },
    }));

  // easy-rsa refuses to reissue an existing CN, which is the behaviour we want:
  // a second call after a partial failure resumes rather than forking identities.
  await inContainer(
    `easyrsa build-client-full ${profile.commonName} nopass 2>&1 || true`
  );

  await prisma.vpnProfile.update({
    where: { id: profile.id },
    data: { issuedAt: new Date() },
  });

  return profile.commonName;
}

/** Returns the .ovpn bundle — config plus the client's keys — as text. */
export async function buildClientConfig(commonName: string): Promise<string> {
  const config = await inContainer(`ovpn_getclient ${commonName}`);

  if (!config.includes('</key>')) {
    throw new ApiError(
      500,
      'OpenVPN did not return a complete client configuration'
    );
  }

  return config;
}

/**
 * Revokes a user's certificate and marks the profile dead.
 *
 * The certificate is the whole credential — anyone holding the .ovpn file is
 * that user to the tunnel — so this is the only thing that takes access away
 * from a shared or stolen copy. It relies on the server running with
 * `crl-verify`; without that directive the revocation list is written and never
 * read, and a revoked key keeps working.
 *
 * `remove` drops the key material too, so the same common name can be issued
 * again later if the account is restored.
 */
export async function revokeClientCertificate(userId: string): Promise<void> {
  const profile = await prisma.vpnProfile.findUnique({ where: { userId } });
  if (!profile || profile.revokedAt) return;

  if (profile.issuedAt) {
    await inContainer(
      `EASYRSA_BATCH=1 ovpn_revokeclient ${profile.commonName} remove 2>&1`
    );
  }

  await prisma.vpnProfile.update({
    where: { id: profile.id },
    data: { revokedAt: new Date(), connected: false, virtualIp: null },
  });
}

/**
 * Best-effort revocation for paths where the caller's own job must not fail if
 * the VPN host is unreachable — blocking an account has to succeed either way.
 */
export async function tryRevokeClientCertificate(
  userId: string
): Promise<void> {
  try {
    await revokeClientCertificate(userId);
  } catch {
    // Swallowed on purpose; the account change is the operation being asked for.
  }
}
