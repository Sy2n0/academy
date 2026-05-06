import { broadcastEvent, sendToUser } from './websocket';
import { prisma } from '@/lib/prisma';

/**
 * First Blood 알림 전송
 */
export async function notifyFirstBlood(
  machineId: string,
  userId: string,
  machineName: string,
  userName: string
): Promise<void> {
  // 전체 브로드캐스트
  broadcastEvent('first_blood', {
    machineId,
    machineName,
    userId,
    userName,
    timestamp: new Date().toISOString(),
  });

  // EventLog 기록
  await prisma.eventLog.create({
    data: {
      type: 'first_blood',
      userId,
      machineId,
      message: `${userName} got First Blood on ${machineName}! 🩸`,
      metadata: {
        machineName,
        userName,
      },
    },
  });
}

/**
 * 플래그 제출 알림
 */
export async function notifyFlagSubmission(
  machineId: string,
  userId: string,
  isCorrect: boolean,
  machineName: string,
  userName: string
): Promise<void> {
  if (isCorrect) {
    broadcastEvent('flag_submitted', {
      machineId,
      machineName,
      userId,
      userName,
      isCorrect: true,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Machine 활성화/비활성화 알림
 */
export function notifyMachineStatusChange(
  machineId: string,
  machineName: string,
  isActive: boolean
): void {
  broadcastEvent('machine_status_changed', {
    machineId,
    machineName,
    isActive,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 사용자에게 개인 알림 전송
 */
export function notifyUser(
  userId: string,
  type: string,
  message: string,
  data?: any
): void {
  sendToUser(userId, 'notification', {
    type,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}
