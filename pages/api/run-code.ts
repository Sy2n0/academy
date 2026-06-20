import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// 지원하는 언어와 실행 명령어
const LANGUAGE_COMMANDS: Record<
  string,
  { command: string; extension: string; timeout?: number }
> = {
  python: { command: 'python3', extension: '.py', timeout: 5000 },
  py: { command: 'python3', extension: '.py', timeout: 5000 },
  node: { command: 'node', extension: '.js', timeout: 5000 },
  javascript: { command: 'node', extension: '.js', timeout: 5000 },
  js: { command: 'node', extension: '.js', timeout: 5000 },
  bash: { command: 'bash', extension: '.sh', timeout: 5000 },
  sh: { command: 'bash', extension: '.sh', timeout: 5000 },
  // 추가 언어는 필요에 따라 추가 가능
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }

    const lang = (language || 'javascript').toLowerCase();
    const langConfig = LANGUAGE_COMMANDS[lang];

    if (!langConfig) {
      return res.status(400).json({
        error: `Language "${language}" is not supported. Supported languages: ${Object.keys(LANGUAGE_COMMANDS).join(', ')}`,
      });
    }

    const executionTimeout = langConfig.timeout || 5000;

    // bash/sh 명령어는 직접 실행 (화이트리스트)
    if ((lang === 'bash' || lang === 'sh') && typeof code === 'string') {
      // 허용 명령어만 더미 데이터로 응답 (실데이터 노출 방지)
      const allowed = ['ls', 'pwd', 'echo', 'cat', 'whoami', 'date', 'uname'];
      const cmd = code.trim().split(/\s+/)[0];
      if (!allowed.includes(cmd)) {
        return res
          .status(400)
          .json({ error: `Command '${cmd}' is not allowed.` });
      }
      // 더미 결과 정의
      const dummyResults: Record<string, string> = {
        ls: 'Desktop\nDocuments\nDownloads\nREADME.md',
        pwd: '/home/user',
        echo: code.replace(/^echo\s+/, ''),
        cat: 'This is a sample file content.',
        whoami: 'user',
        date: 'Thu Mar 19 12:34:56 UTC 2026',
        uname: 'Linux sample-host 5.15.0-102-generic #1 SMP',
      };
      let output = dummyResults[cmd] || '(No output)';
      // echo, cat 등 인자 처리
      if (cmd === 'echo') {
        output = code.replace(/^echo\s+/, '');
      }
      if (cmd === 'cat') {
        output = 'This is a sample file content.';
      }
      return res.status(200).json({
        output,
        error: null,
      });
    }

    // 기존 언어(파이썬, JS 등)는 임시 파일 방식 유지
    const tempDir = tmpdir();
    const tempFile = join(tempDir, `code-${Date.now()}${langConfig.extension}`);
    try {
      await writeFile(tempFile, code, 'utf-8');
      const { stdout, stderr } = (await Promise.race([
        execAsync(`${langConfig.command} ${tempFile}`),
        new Promise<{ stdout: string; stderr: string }>((_, reject) =>
          setTimeout(
            () => reject(new Error('Execution timeout')),
            executionTimeout
          )
        ),
      ])) as { stdout: string; stderr: string };
      await unlink(tempFile).catch(() => {});
      res.status(200).json({
        output: stdout || '(No output)',
        error: stderr || null,
      });
    } catch (execError: any) {
      await unlink(tempFile).catch(() => {});
      if (execError.message === 'Execution timeout') {
        return res.status(408).json({
          error: `Execution timeout after ${executionTimeout}ms`,
          output: null,
        });
      }
      const errorOutput =
        execError.stderr || execError.message || 'Execution failed';
      res.status(200).json({
        output: execError.stdout || null,
        error: errorOutput,
      });
    }
  } catch (error: any) {
    console.error('[API /run-code] Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to execute code',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
