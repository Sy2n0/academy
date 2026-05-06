import { exec } from 'child_process';
import { promisify } from 'util';
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
  memoryLimit?: number
): Promise<{
  containerId: string;
  ipAddress: string;
  portMappings: Record<number, number>;
}> {
  try {
    // 포트 바인딩 설정
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
    const exposedPorts: Record<string, {}> = {};

    ports.forEach(({ host, container }) => {
      const key = `${container}/tcp`;
      portBindings[key] = [{ HostPort: host.toString() }];
      exposedPorts[key] = {};
    });

    // 환경 변수 설정
    const envVars = Object.entries(env).map(([key, value]) => `${key}=${value}`);

    // 컨테이너 생성 옵션
    const createOptions: Docker.ContainerCreateOptions = {
      Image: image,
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portBindings,
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
    await container.inspect();
    const ipAddress = process.env.ATTACKBOX_HOST || '';

    // 포트 매핑 정보
    const portMappings: Record<number, number> = {};
    ports.forEach(({ host, container }) => {
      portMappings[container] = host;
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
    const net = require('net');
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
export async function findAvailablePort(startPort: number = 20000, endPort: number = 30000): Promise<number> {
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
