import { prisma } from '@/lib/prisma';
import {
  createContainer,
  stopContainer,
  removeContainer,
  getContainerStatus,
  findAvailablePort,
} from '@/lib/docker';
import crypto from 'crypto';

/**
 * 동적 컨테이너 인스턴스 생성
 */
export async function createContainerInstance(
  machineId: string,
  userId: string | null,
  teamId: string | null
): Promise<{
  id: string;
  containerId: string;
  ipAddress: string;
  ports: Record<number, number>;
  flag: string;
}> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
  });

  if (!machine) {
    throw new Error('Machine not found');
  }

  if (!machine.containerImage) {
    throw new Error('Machine does not have a container image');
  }

  if (machine.type !== 'DYNAMIC_CONTAINER') {
    throw new Error('Machine type does not support dynamic containers');
  }

  // 플래그 생성
  const flagTemplate = machine.flagTemplate || 'flag{xxx}';
  const randomPart = crypto.randomBytes(16).toString('hex');
  const flag = flagTemplate.replace('xxx', randomPart);

  // 사용 가능한 포트 찾기
  const hostPort = await findAvailablePort();
  const containerPort = machine.servicePort || 1337;

  // 환경 변수에 플래그 추가
  const env: Record<string, string> = {
    FLAG: flag,
  };

  // 컨테이너 생성
  const container = await createContainer(
    machine.containerImage,
    [{ host: hostPort, container: containerPort }],
    env,
    machine.cpuLimit ?? undefined,
    machine.memoryLimit ?? undefined
  );

  // 만료 시간 설정 (기본 24시간)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // DB에 기록
  const instance = await prisma.containerInstance.create({
    data: {
      machineId,
      userId: userId || null,
      teamId: teamId || null,
      containerId: container.containerId,
      status: 'running',
      ipAddress: container.ipAddress,
      ports: container.portMappings,
      flag,
      expiresAt,
    },
  });

  // MachineFlag에도 기록
  await prisma.machineFlag.create({
    data: {
      machineId,
      userId: userId || null,
      teamId: teamId || null,
      flag,
      isStatic: false,
    },
  });

  return {
    id: instance.id,
    containerId: container.containerId,
    ipAddress: container.ipAddress,
    ports: container.portMappings,
    flag,
  };
}

/**
 * 컨테이너 인스턴스 중지
 */
export async function stopContainerInstance(instanceId: string): Promise<void> {
  const instance = await prisma.containerInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new Error('Container instance not found');
  }

  await stopContainer(instance.containerId);

  await prisma.containerInstance.update({
    where: { id: instanceId },
    data: {
      status: 'stopped',
      stoppedAt: new Date(),
    },
  });
}

/**
 * 컨테이너 인스턴스 삭제
 */
export async function removeContainerInstance(instanceId: string): Promise<void> {
  const instance = await prisma.containerInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new Error('Container instance not found');
  }

  try {
    await removeContainer(instance.containerId);
  } catch (error) {
    // 컨테이너가 이미 삭제된 경우 무시
    console.error('Error removing container:', error);
  }

  await prisma.containerInstance.delete({
    where: { id: instanceId },
  });
}

/**
 * 만료된 컨테이너 정리
 */
export async function cleanupExpiredContainers(): Promise<number> {
  const expiredInstances = await prisma.containerInstance.findMany({
    where: {
      status: 'running',
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  let cleanedCount = 0;

  for (const instance of expiredInstances) {
    try {
      await stopContainer(instance.containerId);
      await removeContainer(instance.containerId);
      await prisma.containerInstance.update({
        where: { id: instance.id },
        data: {
          status: 'stopped',
          stoppedAt: new Date(),
        },
      });
      cleanedCount++;
    } catch (error) {
      console.error(`Error cleaning up container ${instance.id}:`, error);
    }
  }

  return cleanedCount;
}

/**
 * 컨테이너 상태 동기화 (주기적으로 실행)
 */
export async function syncContainerStatuses(): Promise<void> {
  const runningInstances = await prisma.containerInstance.findMany({
    where: {
      status: 'running',
    },
  });

  for (const instance of runningInstances) {
    try {
      const status = await getContainerStatus(instance.containerId);
      
      if (status.status !== 'running' && instance.status === 'running') {
        await prisma.containerInstance.update({
          where: { id: instance.id },
          data: {
            status: status.status,
            stoppedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`Error syncing container ${instance.id}:`, error);
    }
  }
}
