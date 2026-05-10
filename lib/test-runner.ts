import { spawn } from 'child_process';
import path from 'path';
import { prisma } from '@/lib/prisma';

export interface TestRunOptions {
  trigger?: string;
  commit?: string;
  branch?: string;
  testPattern?: string;
}

export async function startTestRun(options: TestRunOptions = {}): Promise<string> {
  const { trigger = 'manual', commit, branch, testPattern } = options;

  const run = await prisma.testRun.create({
    data: {
      status: 'RUNNING',
      trigger,
      commit: commit ?? null,
      branch: branch ?? null,
    },
  });

  executeTests(run.id, testPattern).catch(async (err) => {
    await prisma.testRun.update({
      where: { id: run.id },
      data: { status: 'ERROR', results: { error: err.message } },
    });
  });

  return run.id;
}

async function executeTests(runId: string, testPattern?: string): Promise<void> {
  const appDir = path.resolve(process.cwd());
  const startedAt = Date.now();

  const args = [
    'jest',
    '--json',
    '--forceExit',
    '--testPathIgnorePatterns=tests/e2e',
  ];

  if (testPattern) {
    args.push('--testPathPattern', testPattern);
  }

  const output = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const proc = spawn('npx', args, {
      cwd: appDir,
      env: { ...process.env, CI: 'true' },
    });

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on('data', () => {});

    proc.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
    proc.on('error', reject);
  });

  const duration = Math.round((Date.now() - startedAt) / 1000);

  let parsed: any = null;
  try {
    const jsonStart = output.indexOf('{');
    if (jsonStart !== -1) {
      parsed = JSON.parse(output.slice(jsonStart));
    }
  } catch {
    await prisma.testRun.update({
      where: { id: runId },
      data: { status: 'ERROR', duration, results: { raw: output.slice(0, 2000) } },
    });
    return;
  }

  const passed = parsed?.numPassedTests ?? 0;
  const failed = parsed?.numFailedTests ?? 0;
  const skipped = (parsed?.numPendingTests ?? 0) + (parsed?.numTodoTests ?? 0);
  const success = parsed?.success ?? false;

  const suites = (parsed?.testResults ?? []).map((suite: any) => ({
    file: suite.testFilePath?.replace(appDir, '').replace(/^\//, ''),
    passed: suite.numPassingTests,
    failed: suite.numFailingTests,
    tests: (suite.testResults ?? []).map((t: any) => ({
      name: t.fullName,
      status: t.status,
      duration: t.duration,
      failureMessages: t.failureMessages,
    })),
  }));

  await prisma.testRun.update({
    where: { id: runId },
    data: {
      status: success ? 'PASSED' : 'FAILED',
      passedCount: passed,
      failedCount: failed,
      skipCount: skipped,
      duration,
      results: { suites },
    },
  });
}
