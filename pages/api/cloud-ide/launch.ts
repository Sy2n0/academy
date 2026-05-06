import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

const DOCKER_IMAGE = 'cloud-ide:latest';
const PORT_MIN = 20000;
const PORT_MAX = 30000;

async function waitForCloudIdeReady(port: number, timeoutMs = 20000): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'GET',
        redirect: 'manual',
      });

      // code-server commonly returns 302 -> ./login when ready.
      if (res.status === 200 || res.status === 302 || res.status === 401) {
        return true;
      }
    } catch {
      // Keep polling until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * POST: Cloud IDE 실행 (code-server)
 * body.port (20000–30000) → 8080 매핑
 * docker run -d --name cloud-ide-{port} -p {port}:8080 -e PASSWORD=... -v /tmp/cloud-ide-data/cloud-ide-{port}:/workspace cloud-ide:latest
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

  const prismaAny = prisma as any;
  const existingModel = prismaAny.cloudIDESession as
    | {
        findUnique?: (args: { where: { userId: string } }) => Promise<{
          host: string;
          port: number;
          password: string;
          containerName: string;
        } | null>;
      }
    | undefined;
  if (existingModel?.findUnique) {
    const existing = await existingModel.findUnique({ where: { userId: user.id } });
    if (existing) {
      const inspect = await execAsync(
        `docker ps --filter name=^/${existing.containerName}$ --format "{{.Names}}"`
      ).catch(() => ({ stdout: '' }));
      const isRunning = typeof inspect.stdout === 'string' && inspect.stdout.trim() === existing.containerName;

      if (isRunning) {
        const isReady = await waitForCloudIdeReady(existing.port, 12000);
        if (!isReady) {
          console.warn('[cloud-ide/launch] existing container running but not ready, recreating', {
            userId: user.id,
            containerName: existing.containerName,
            port: existing.port,
          });
        } else {
        return res.status(200).json({
          success: true,
          host: existing.host,
          port: existing.port,
          password: existing.password,
          containerName: existing.containerName,
          launched: false,
        });
        }
      }

      const deleteModel = existingModel as { deleteMany?: (args: { where: { userId: string } }) => Promise<unknown> };
      if (deleteModel.deleteMany) {
        await deleteModel.deleteMany({ where: { userId: user.id } });
      }
    }
  }

  const portFromBody =
    typeof req.body?.port === 'number' && Number.isInteger(req.body.port) && req.body.port >= PORT_MIN && req.body.port <= PORT_MAX
      ? req.body.port
      : null;
  const isAutoPort = portFromBody === null;
  const password = typeof req.body?.password === 'string' && req.body.password.trim()
    ? req.body.password.trim()
    : `ide-${Date.now().toString(36)}`;

  const failedPorts = new Set<number>();
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let port: number;

    if (isAutoPort) {
      const sessionModel = prismaAny.cloudIDESession as
        | { findMany?: () => Promise<{ port: number }[]> }
        | undefined;
      const attackBoxModel = prismaAny.attackBoxSession as
        | { findMany?: () => Promise<{ port: number; port8080: number }[]> }
        | undefined;
      const used = new Set<number>();
      if (sessionModel?.findMany) {
        const rows = await sessionModel.findMany();
        rows.forEach((r) => used.add(r.port));
      }
      if (attackBoxModel?.findMany) {
        const rows = await attackBoxModel.findMany();
        rows.forEach((r) => { used.add(r.port); used.add(r.port8080); });
      }
      failedPorts.forEach((p) => used.add(p));
      let found: number | null = null;
      for (let p = PORT_MIN; p <= PORT_MAX; p++) {
        if (!used.has(p)) {
          found = p;
          break;
        }
      }
      if (found === null) {
        return res.status(503).json({ error: { message: 'No available port in range 20000–30000 (all in use or failed)' } });
      }
      port = found;
    } else {
      port = portFromBody as number;
    }

    const containerName = `cloud-ide-${port}`;
    const volumePath = `/tmp/cloud-ide-data/${containerName}`;

    try {
      await execAsync(`mkdir -p ${volumePath}`);
    } catch (e) {
      // ignore
    }
    try {
      await execAsync(`docker rm -f ${containerName}`);
    } catch (e) {
      // ignore
    }

    const dockerCmd = [
      'docker', 'run', '-d',
      '--name', containerName,
      '-e', `PASSWORD=${password}`,
      '-p', `${port}:8080`,
      '-v', `${volumePath}:/workspace`,
      DOCKER_IMAGE,
    ].join(' ');

    try {
      await execAsync(dockerCmd);

      const isReady = await waitForCloudIdeReady(port, 20000);
      if (!isReady) {
        throw new Error(`Cloud IDE did not become ready on port ${port} within timeout`);
      }

      const host = process.env.CLOUDIDE_HOST || (req.headers?.host && req.headers.host.split(':')[0]) || 'localhost';

      const sessionModel = prismaAny.cloudIDESession as
        | { upsert?: (args: unknown) => Promise<unknown> }
        | undefined;
      if (sessionModel?.upsert) {
        await sessionModel.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            containerName,
            host,
            port,
            password,
          },
          update: {
            containerName,
            host,
            port,
            password,
          },
        });
      } else {
        console.warn('[cloud-ide/launch] prisma.cloudIDESession not found — run: npx prisma generate');
      }

      console.log('[cloud-ide/launch]', { userId: user.id, port, containerName });
      return res.status(200).json({
        success: true,
        host,
        port,
        password,
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
        try {
          await execAsync(`docker rm -f ${containerName}`);
        } catch (e) {
          // ignore
        }
        console.warn('[cloud-ide/launch] port in use, retrying', { port, attempt: attempt + 1 });
        continue;
      }

      console.error('[cloud-ide/launch]', { userId: user.id, port, error: msg, stderr, stdout });
      return res.status(500).json({
        error: { message: 'Docker run failed', detail: detail || msg },
      });
    }
  }

  return res.status(503).json({
    error: { message: 'Docker run failed', detail: 'Could not find a free port after retries (address already in use)' },
  });
}
