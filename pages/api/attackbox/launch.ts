import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `/usr/bin/docker inspect --format '{{.State.Running}}' ${containerName}`
    );
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function waitForPort(port: number, timeoutMs = 8000): Promise<void> {
  const net = await import('net');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const connected = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ port, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
      sock.setTimeout(500, () => { sock.destroy(); resolve(false); });
    });
    if (connected) return;
    await new Promise((r) => setTimeout(r, 300));
  }
}

const PORT_MIN = 20000;
const PORT_MAX = 25000;

async function getUsedPorts(): Promise<Set<number>> {
  const used = new Set<number>();
  const prismaAny = prisma as any;
  const abs = prismaAny.attackBoxSession as
    | { findMany?: () => Promise<{ port: number; port8080: number }[]> }
    | undefined;
  const cide = prismaAny.cloudIDESession as
    | { findMany?: () => Promise<{ port: number }[]> }
    | undefined;
  if (abs?.findMany) {
    const rows = await abs.findMany();
    rows.forEach((r) => { used.add(r.port); used.add(r.port8080); });
  }
  if (cide?.findMany) {
    const rows = await cide.findMany();
    rows.forEach((r) => used.add(r.port));
  }
  return used;
}

function imageToBoxName(image: string): string {
  if (image.includes('kali')) return 'Kali';
  if (image.includes('ubuntu')) return 'Ubuntu';
  if (image.includes('parrot')) return 'Parrot';
  return 'Kali';
}

/** 이미지 식별자 → Docker 이미지 태그 */
const IMAGE_TO_DOCKER: Record<string, string> = {
  '@PLATFORM/HUB-ATTACKBOX/kali-rolling': 'kali-attackbox:latest',
  // '@PLATFORM/HUB-ATTACKBOX/ubuntu-22.04': 'attackbox-ubuntu:latest',
  // '@PLATFORM/HUB-ATTACKBOX/parrot': 'attackbox-parrot:latest',
};

/**
 * POST: Attack box 실행 요청
 * body.image, body.port (20000–30000), body.username
 * docker run -d --name attackbox-kali -p {port}:22 -p {port+1}:8080 -v /tmp/attackbox-data:/data attackbox-kali:latest
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const image = typeof req.body?.image === 'string' ? req.body.image.trim() : null;
  if (!image) {
    return res.status(400).json({ error: { message: 'image is required' } });
  }

  const dockerImage = IMAGE_TO_DOCKER[image];
  if (!dockerImage) {
    return res.status(400).json({ error: { message: 'Unsupported image' } });
  }

  // 기존 세션 있으면 그대로 반환 (Track/Module 재호출 시)
  const existingModel = (prisma as any).attackBoxSession as
    | {
        findUnique?: (args: { where: { userId: string } }) => Promise<{
          host: string;
          port: number;
          port8080: number;
          username: string;
          containerName: string;
          boxName: string;
        } | null>;
      }
    | undefined;
  if (existingModel?.findUnique) {
    const existing = await existingModel.findUnique({ where: { userId: user.id } });
    if (existing) {
      const running = await isContainerRunning(existing.containerName);
      if (running) {
        return res.status(200).json({
          success: true,
          image,
          host: existing.host,
          port: existing.port,
          port8080: existing.port8080,
          username: existing.username,
          containerName: existing.containerName,
          launched: false,
        });
      }
      // 컨테이너가 죽어있으면 스테일 세션 삭제 후 새로 실행
      await prisma.attackBoxSession.deleteMany({ where: { userId: user.id } }).catch(() => {});
    }
  }

  const portRaw = req.body?.port;
  const isAutoPort =
    !(typeof portRaw === 'number' && Number.isInteger(portRaw) && portRaw >= PORT_MIN && portRaw <= PORT_MAX);

  const webPortRaw = req.body?.webPort;
  // Track/Module에서 호출 시(포트 미지정) 사용자명 HUB 고정, 그 외에는 필수
  let username: string;
  const usernameRaw = typeof req.body?.username === 'string' ? req.body.username.trim() : null;
  if (isAutoPort) {
    username = 'HUB';
  } else {
    if (!usernameRaw) {
      return res.status(400).json({ error: { message: 'username is required' } });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(usernameRaw)) {
      return res.status(400).json({ error: { message: 'username: letters, numbers, underscore, hyphen only' } });
    }
    username = usernameRaw;
  }

  const baseName = dockerImage.split(':')[0];
  const failedPorts = new Set<number>();
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let port: number;
    let port8080: number;

    if (isAutoPort) {
      const used = await getUsedPorts();
      failedPorts.forEach((p) => used.add(p));
      let found: number | null = null;
      const range = PORT_MAX - PORT_MIN - 1;
      const randomStart = PORT_MIN + Math.floor(Math.random() * range);
      for (let i = 0; i < range; i++) {
        const p = PORT_MIN + ((randomStart - PORT_MIN + i) % range);
        if (!used.has(p) && !used.has(p + 1)) {
          found = p;
          break;
        }
      }
      if (found === null) {
        return res.status(503).json({ error: { message: 'No available port in range 20000–25000 (all in use or failed)' } });
      }
      port = found;
      port8080 = port + 1 <= PORT_MAX ? port + 1 : port - 1;
    } else {
      port = portRaw as number;
      const wp =
        typeof webPortRaw === 'number' && Number.isInteger(webPortRaw) && webPortRaw >= PORT_MIN && webPortRaw <= PORT_MAX
          ? webPortRaw
          : null;
      if (wp !== null && wp === port) {
        return res.status(400).json({ error: { message: 'SSH port and Web port must be different' } });
      }
      port8080 = wp ?? (port + 1 <= PORT_MAX ? port + 1 : port - 1);
    }

    const containerName = `${baseName}-${port}`;
    const volumePath = `/tmp/attackbox-data/${containerName}`;

    try {
      await execAsync(`/usr/bin/docker rm -f ${containerName}`);
    } catch (e) {
      // 없으면 무시
    }

    try {
      await execAsync(`rm -rf ${volumePath}`);
      await execAsync(`mkdir -p ${volumePath}`);
    } catch (e) {
      // ignore
    }

    const dockerCmd = [
      '/usr/bin/docker', 'run', '-d',
      '--name', containerName,
      '--privileged',
      '-v', '/var/run/docker.sock:/var/run/docker.sock',
      '-e', `USERNAME=${username}`,
      '-p', `${port}:22`,
      '-p', `${port8080}:8080`,
      '-v', `${volumePath}:/data`,
      dockerImage,
    ].join(' ');

    try {
      const { stdout, stderr } = await execAsync(dockerCmd);
      // ttyd가 포트를 열 때까지 대기 (최대 8초)
      await waitForPort(port8080);
      const host = process.env.ATTACKBOX_HOST || (req.headers?.host && req.headers.host.split(':')[0]) || 'localhost';
      const boxName = imageToBoxName(image);

      await prisma.attackBoxSession.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          boxName,
          containerName,
          host,
          port,
          port8080,
          username,
        },
        update: {
          boxName,
          containerName,
          host,
          port,
          port8080,
          username,
        },
      });

      console.log('[attackbox/launch]', { userId: user.id, image, port, port8080, username, containerName, stdout: stdout?.trim(), stderr: stderr?.trim() });
      return res.status(200).json({
        success: true,
        image,
        host,
        port,
        port8080,
        username,
        containerName,
        launched: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const execErr = err as { stderr?: string; stdout?: string };
      const stderr = typeof execErr?.stderr === 'string' ? execErr.stderr.trim() : '';
      const stdout = typeof execErr?.stdout === 'string' ? execErr.stdout.trim() : '';
      const detail = stderr || stdout || msg;
      const isAddressInUse =
        /address already in use|bind|port.*already/i.test(detail) || /address already in use|bind|port.*already/i.test(msg);

      if (isAutoPort && isAddressInUse) {
        failedPorts.add(port);
        failedPorts.add(port8080);
        try {
          await execAsync(`/usr/bin/docker rm -f ${containerName}`);
        } catch (e) {
          // ignore
        }
        console.warn('[attackbox/launch] port in use, retrying', { port, port8080, attempt: attempt + 1 });
        continue;
      }

      console.error('[attackbox/launch]', { userId: user.id, image, port, username, error: msg, stderr, stdout });
      return res.status(500).json({
        error: { message: 'Docker run failed', detail: detail || msg },
      });
    }
  }

  return res.status(503).json({
    error: { message: 'Docker run failed', detail: 'Could not find a free port after retries (address already in use)' },
  });
}
