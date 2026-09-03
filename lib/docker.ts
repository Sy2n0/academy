import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import Docker from 'dockerode';

const execAsync = promisify(exec);

// Docker 클라이언트 초기화
const docker = new Docker();

/**
 * Docker 컨테이너 생성 및 시작
 */
export async function createContainer(
  image: string,
  ports: Array<{ host: number; container: number }>,
  env: Record<string, string> = {},
  cpuLimit?: number,
  memoryLimit?: number,
  /**
   * Attach to a user-defined network instead of publishing to the host.
   *
   * Machines take this so their only route in is the VPN; the sandbox and the
   * learn terminal do not, because those are web terminals the browser has to
   * reach directly. When set, the returned address is the container's address
   * on that network rather than the host's.
   */
  network?: string
): Promise<{
  containerId: string;
  ipAddress: string;
  portMappings: Record<number, number>;
}> {
  try {
    // 포트 바인딩 설정
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
    const exposedPorts: Record<string, object> = {};

    ports.forEach(({ host, container }) => {
      const key = `${container}/tcp`;
      portBindings[key] = [{ HostPort: host.toString() }];
      exposedPorts[key] = {};
    });

    // 환경 변수 설정
    const envVars = Object.entries(env).map(
      ([key, value]) => `${key}=${value}`
    );

    // 컨테이너 생성 옵션
    const createOptions: Docker.ContainerCreateOptions = {
      Image: image,
      ExposedPorts: exposedPorts,
      ...(network
        ? { NetworkingConfig: { EndpointsConfig: { [network]: {} } } }
        : {}),
      HostConfig: {
        // Publishing is skipped entirely on a networked container — a bound
        // host port would be a way around the tunnel.
        PortBindings: network ? {} : portBindings,
        ...(network ? { NetworkMode: network } : {}),
        Memory: memoryLimit ? memoryLimit * 1024 * 1024 : undefined, // MB to bytes
        CpuShares: cpuLimit ? cpuLimit * 1024 : undefined, // 0.1 CPU units to shares
        AutoRemove: false,
        RestartPolicy: { Name: 'no' },
      },
      Env: envVars,
    };

    // 컨테이너 생성
    const container = await docker.createContainer(createOptions);

    // 컨테이너 시작
    await container.start();

    // 컨테이너 정보 가져오기
    const info = await container.inspect();
    const ipAddress = network
      ? (info.NetworkSettings?.Networks?.[network]?.IPAddress ?? '')
      : process.env.ATTACKBOX_HOST || '';

    // 포트 매핑 정보
    // On the machine network the service keeps its own port; there is no host
    // port to map it to, and reporting one would send students to the wrong
    // address.
    const portMappings: Record<number, number> = {};
    ports.forEach(({ host, container }) => {
      portMappings[container] = network ? container : host;
    });

    return {
      containerId: container.id,
      ipAddress,
      portMappings,
    };
  } catch (error: any) {
    throw new Error(`Failed to create container: ${error.message}`);
  }
}

/**
 * 컨테이너 중지
 */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
  } catch (error: any) {
    // 이미 중지된 경우 무시
    if (!error.message.includes('not running')) {
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  }
}

/**
 * 컨테이너 삭제
 */
export async function removeContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.remove({ force: true });
  } catch (error: any) {
    throw new Error(`Failed to remove container: ${error.message}`);
  }
}

/**
 * 컨테이너 상태 확인
 */
export async function getContainerStatus(containerId: string): Promise<{
  status: string;
  running: boolean;
  ipAddress?: string;
}> {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();

    return {
      status: info.State?.Status || 'unknown',
      running: info.State?.Running || false,
      ipAddress: info.NetworkSettings?.IPAddress,
    };
  } catch (error: any) {
    return {
      status: 'not_found',
      running: false,
    };
  }
}

/**
 * 특정 포트가 사용 중인지 확인
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '0.0.0.0');
  });
}

/**
 * 20000~30000 사이에서 랜덤으로 사용 가능한 포트 찾기
 */
export async function findAvailablePort(
  startPort: number = 20000,
  endPort: number = 30000
): Promise<number> {
  const range = endPort - startPort;
  const tried = new Set<number>();

  while (tried.size < range) {
    const port = startPort + Math.floor(Math.random() * range);
    if (tried.has(port)) continue;
    tried.add(port);
    const inUse = await isPortInUse(port);
    if (!inUse) return port;
  }

  throw new Error('No available port found in range');
}

/**
 * Runs a command inside a container and returns what it said.
 *
 * This is how an exercise is checked: the student's own terminal container is
 * asked whether the thing they were told to do is actually there. It inspects
 * state rather than comparing typed commands, so a student who reaches the same
 * result a different way still passes.
 *
 * The command is run through `sh -c`, so it must never be assembled from user
 * input — checks are authored content, not something a learner supplies.
 */
export async function execInContainer(
  containerId: string,
  command: string,
  timeoutMs = 5000
): Promise<{ exitCode: number; output: string }> {
  const container = docker.getContainer(containerId);

  const exec = await container.exec({
    Cmd: ['sh', '-c', command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, Detach: false });

  const output = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      stream.destroy();
      reject(new Error('Check timed out'));
    }, timeoutMs);

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      clearTimeout(timer);
      // Docker multiplexes stdout and stderr into 8-byte-framed chunks when the
      // container has no TTY; strip the headers so the caller sees plain text.
      resolve(demultiplex(Buffer.concat(chunks)));
    });
    stream.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const info = await exec.inspect();

  return { exitCode: info.ExitCode ?? 1, output: output.trim() };
}

function demultiplex(buffer: Buffer): string {
  let out = '';
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const type = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);

    // A frame header always starts with a stream type of 0-2; anything else
    // means this output was never framed and should be read as-is.
    if (type > 2) return buffer.toString('utf8');

    out += buffer.toString('utf8', offset + 8, offset + 8 + size);
    offset += 8 + size;
  }

  return out || buffer.toString('utf8');
}
