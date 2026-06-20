import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/storage';
import { isAdmin } from '@/lib/user-roles';

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

const SOURCE_LIMIT = 100_000;
const STDIN_LIMIT = 20_000;
const SANDBOX_TIMEOUT_MS = 8_000;
const SANDBOX_IMAGE = process.env.PLAYGROUND_C_SANDBOX_IMAGE || 'gcc:14.2.0';
const ATTACHMENT_PUBLIC_BASE = (
  process.env.PLAYGROUND_ATTACHMENT_PUBLIC_BASE_URL ||
  'https://bucket.hub-h4ck.com'
).replace(/\/+$/, '');

const normalize = (value: string) => value.trim().toLowerCase();

const execFileAsync = (
  command: string,
  args: string[],
  options: { cwd?: string; timeout?: number }
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const anyError = error as NodeJS.ErrnoException & {
            code?: number | string;
          };

          if (
            typeof anyError.code === 'string' &&
            anyError.code === 'ETIMEDOUT'
          ) {
            resolve({
              stdout: stdout || '',
              stderr: (stderr || '') + '\nSandbox timed out.',
              exitCode: 124,
            });
            return;
          }

          if (typeof anyError.code === 'string' && anyError.code === 'ENOENT') {
            reject(new Error(`${command} is not available on this server`));
            return;
          }

          resolve({
            stdout: stdout || '',
            stderr: stderr || anyError.message || 'Execution failed.',
            exitCode: typeof anyError.code === 'number' ? anyError.code : 1,
          });
          return;
        }

        resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: 0 });
      }
    );
  });
};

const parseMetaFile = (
  content: string
): { phase: 'compile' | 'run'; exitCode: number } => {
  const phaseMatch = content.match(/PHASE=(compile|run)/);
  const codeMatch = content.match(/EXIT_CODE=(-?\d+)/);

  return {
    phase: phaseMatch?.[1] === 'compile' ? 'compile' : 'run',
    exitCode: codeMatch ? Number(codeMatch[1]) : 1,
  };
};

type AttachmentItem = {
  name?: string;
  key?: string;
  url?: string;
  scope?: string;
};

type ComparisonResult = {
  checked: boolean;
  matched: boolean;
  message: string;
};

const extractAttachmentKey = (attachment: AttachmentItem): string => {
  if (typeof attachment.key === 'string' && attachment.key.trim()) {
    return attachment.key.trim();
  }

  if (typeof attachment.url !== 'string' || !attachment.url.trim()) {
    return '';
  }

  const rawUrl = attachment.url.trim();

  if (rawUrl.startsWith('/api/storage/')) {
    const key = rawUrl.replace('/api/storage/', '').split('?')[0] || '';
    return decodeURIComponent(key);
  }

  try {
    const parsed = new URL(rawUrl);
    const hostBase = `${parsed.protocol}//${parsed.host}`;
    if (hostBase === ATTACHMENT_PUBLIC_BASE) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    }
  } catch {
    return '';
  }

  return '';
};

const CHECKER_RESOURCE_SCOPES = new Set([
  'public',
  'programming_checker',
  'programming_header',
  'programming_resource',
  'programming_flag',
  'programming_private',
]);

const isSandboxResourceAttachment = (attachment: AttachmentItem) => {
  const scope = String(attachment.scope || '')
    .trim()
    .toLowerCase();
  if (!scope) {
    // Backward compatibility: old rows may not have scope; treat as public resource.
    return true;
  }

  if (scope === 'programming_answer') {
    return false;
  }

  return CHECKER_RESOURCE_SCOPES.has(scope);
};

const safeBaseName = (value: string) => {
  const base = path.basename(value || '').trim();
  const normalized = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  return normalized || '';
};

const resolveCheckerFileName = (attachment: AttachmentItem, index: number) => {
  const fromName =
    typeof attachment.name === 'string' ? safeBaseName(attachment.name) : '';
  if (fromName) return fromName;

  const key = extractAttachmentKey(attachment);
  const fromKeyRaw = safeBaseName(key);
  const fromKey = fromKeyRaw.replace(/^\d{10,}-/, '');
  if (fromKey) return fromKey;

  return `checker_resource_${index + 1}.txt`;
};

const writeCheckerResources = async (
  attachmentsValue: unknown,
  workDir: string
) => {
  if (!Array.isArray(attachmentsValue)) {
    return { writtenFiles: [] as string[], hasCheckerResources: false };
  }

  const items = (attachmentsValue as unknown[])
    .filter(
      (item): item is AttachmentItem => !!item && typeof item === 'object'
    )
    .filter((item) => isSandboxResourceAttachment(item));

  if (items.length === 0) {
    return { writtenFiles: [] as string[], hasCheckerResources: false };
  }

  const bucket = process.env.S3_BUCKET || 'hub-academy';
  const writtenFiles: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const key = extractAttachmentKey(item);
    if (!key) continue;

    const fileBuffer = await downloadFile(bucket, key);
    let targetName = resolveCheckerFileName(item, index);

    if (targetName.toLowerCase() === 'main.c') {
      // Keep provided example main source for reference only, never compile it with user submission.
      targetName = `provided_main_${index + 1}.c.txt`;
    }

    const targetPath = path.join(workDir, targetName);
    await fs.writeFile(targetPath, fileBuffer);
    writtenFiles.push(targetName);
  }

  return { writtenFiles, hasCheckerResources: writtenFiles.length > 0 };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  let workDir = '';

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res
        .status(401)
        .json({ error: { message: '로그인이 필요합니다.' } });
    }

    const challengeId =
      typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
    const source = typeof req.body?.source === 'string' ? req.body.source : '';
    const stdin = typeof req.body?.stdin === 'string' ? req.body.stdin : '';

    if (!challengeId) {
      return res
        .status(400)
        .json({ error: { message: 'challengeId is required' } });
    }

    if (!source.trim()) {
      return res
        .status(400)
        .json({ error: { message: 'C source code is required' } });
    }

    if (source.length > SOURCE_LIMIT) {
      return res
        .status(400)
        .json({ error: { message: 'Source code is too large' } });
    }

    if (stdin.length > STDIN_LIMIT) {
      return res.status(400).json({ error: { message: 'Input is too large' } });
    }

    const challenge = await prisma.playgroundChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        category: true,
        playgroundCodeName: true,
        isActive: true,
        attachments: true,
        flag: true,
      },
    });

    if (!challenge || !challenge.isActive) {
      return res
        .status(404)
        .json({ error: { message: 'Challenge not found' } });
    }

    if (normalize(challenge.category || '') !== 'programming') {
      return res.status(400).json({
        error: {
          message: 'Compile is only available for Programming challenges',
        },
      });
    }

    const enrolledPlaygrounds = await prisma.playgroundEnrollment.findMany({
      where: { userId: user.id },
      select: {
        playground: {
          select: {
            codeName: true,
          },
        },
      },
    });

    const isEnrolled = enrolledPlaygrounds.some(
      (entry) =>
        normalize(entry.playground.codeName || '') ===
        normalize(challenge.playgroundCodeName || '')
    );

    if (!isEnrolled && !isAdmin(user.role)) {
      return res.status(403).json({
        error: { message: '해당 Playground 참가자만 컴파일할 수 있습니다.' },
      });
    }

    workDir = path.join(os.tmpdir(), `hub-playground-c-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });
    await fs.chmod(workDir, 0o777);

    const sourcePath = path.join(workDir, 'main.c');
    const stdinPath = path.join(workDir, 'stdin.txt');

    await fs.writeFile(sourcePath, source, 'utf8');
    await fs.writeFile(stdinPath, stdin || '', 'utf8');

    const checkerResources = await writeCheckerResources(
      challenge.attachments,
      workDir
    );
    const helperCSources = checkerResources.writtenFiles.filter((name) => {
      const lower = name.toLowerCase();
      return (
        lower.endsWith('.c') &&
        lower !== 'main.c' &&
        !lower.startsWith('provided_main_')
      );
    });

    const successMarker =
      process.env.PLAYGROUND_PROGRAMMING_SUCCESS_MARKER || 'Correct!';

    const helperSourcesArg = helperCSources.join(' ');

    const dockerScript = [
      `helper_sources="${helperSourcesArg}"`,
      'gcc main.c $helper_sources -O2 -std=c11 -o main.out > compile.stdout 2> compile.stderr',
      'compile_code=$?',
      'if [ "$compile_code" -ne 0 ]; then',
      '  printf "PHASE=compile\\nEXIT_CODE=%s\\n" "$compile_code" > meta.env',
      '  exit 0',
      'fi',
      './main.out < stdin.txt > run.stdout 2> run.stderr',
      'run_code=$?',
      'printf "PHASE=run\\nEXIT_CODE=%s\\n" "$run_code" > meta.env',
      'exit 0',
    ].join('\n');

    const dockerArgs = [
      'run',
      '--rm',
      '--user',
      '0:0',
      '--network',
      'none',
      '--cpus',
      '0.5',
      '--memory',
      '256m',
      '--pids-limit',
      '128',
      '--security-opt',
      'no-new-privileges',
      '--cap-drop',
      'ALL',
      '-v',
      `${workDir}:/workspace`,
      '-w',
      '/workspace',
      SANDBOX_IMAGE,
      '/bin/sh',
      '-lc',
      dockerScript,
    ];

    const sandbox = await execFileAsync('docker', dockerArgs, {
      timeout: SANDBOX_TIMEOUT_MS,
    });

    if (sandbox.exitCode !== 0 && sandbox.exitCode !== 124) {
      const stderr =
        sandbox.stderr || sandbox.stdout || 'Docker sandbox execution failed';
      const lower = stderr.toLowerCase();
      if (
        lower.includes('unable to find image') ||
        lower.includes('pull access denied')
      ) {
        return res.status(500).json({
          error: {
            message: `Docker image not available: ${SANDBOX_IMAGE}`,
          },
        });
      }

      return res.status(500).json({
        error: {
          message: `Docker sandbox failed: ${stderr}`,
        },
      });
    }

    if (sandbox.exitCode === 124) {
      return res.status(200).json({
        data: {
          comparison: {
            checked: true,
            matched: false,
            message: 'Execution timed out in sandbox.',
          },
          flag: null,
          phase: 'run',
          success: false,
          stdout: '',
          stderr: 'Execution timed out in sandbox.',
          exitCode: 124,
        },
      });
    }

    const metaPath = path.join(workDir, 'meta.env');
    const compileStdoutPath = path.join(workDir, 'compile.stdout');
    const compileStderrPath = path.join(workDir, 'compile.stderr');
    const runStdoutPath = path.join(workDir, 'run.stdout');
    const runStderrPath = path.join(workDir, 'run.stderr');

    const [
      metaRaw,
      compileStdoutRaw,
      compileStderrRaw,
      runStdoutRaw,
      runStderrRaw,
    ] = await Promise.all([
      fs.readFile(metaPath, 'utf8').catch(() => ''),
      fs.readFile(compileStdoutPath, 'utf8').catch(() => ''),
      fs.readFile(compileStderrPath, 'utf8').catch(() => ''),
      fs.readFile(runStdoutPath, 'utf8').catch(() => ''),
      fs.readFile(runStderrPath, 'utf8').catch(() => ''),
    ]);

    const meta = parseMetaFile(metaRaw);

    if (meta.phase === 'compile') {
      return res.status(200).json({
        data: {
          comparison: {
            checked: true,
            matched: false,
            message: 'Compilation failed before checker validation.',
          },
          flag: null,
          phase: 'compile',
          success: false,
          stdout: compileStdoutRaw,
          stderr: compileStderrRaw,
          exitCode: meta.exitCode,
        },
      });
    }

    const markerMatched = checkerResources.hasCheckerResources
      ? runStdoutRaw.includes(successMarker)
      : true;
    const judgedSuccess = meta.exitCode === 0 && markerMatched;

    const checkerMessage = checkerResources.hasCheckerResources
      ? markerMatched
        ? 'Checker validation passed.'
        : `Checker success marker (${successMarker}) not found.`
      : meta.exitCode === 0
        ? 'Program executed successfully.'
        : 'Program execution failed.';

    return res.status(200).json({
      data: {
        comparison: {
          checked: true,
          matched: judgedSuccess,
          message: checkerMessage,
        },
        flag: judgedSuccess ? challenge.flag : null,
        phase: 'run',
        success: judgedSuccess,
        stdout: runStdoutRaw,
        stderr: runStderrRaw,
        exitCode: meta.exitCode,
      },
    });
  } catch (error: any) {
    console.error('Error compiling C code:', error);
    return res
      .status(500)
      .json({ error: { message: error?.message || 'Failed to compile code' } });
  } finally {
    if (workDir) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => null);
    }
  }
}
