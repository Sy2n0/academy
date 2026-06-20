import { prisma } from '@/lib/prisma';
import {
  UserResource,
  UserAction,
  defaultUserPermissions,
} from '@/lib/user-permissions';

/**
 * 사용자의 권한을 조회합니다.
 * 권한이 없으면 기본 권한을 반환합니다.
 */
export const getUserPermissions = async (userId: string) => {
  const permissions = await prisma.userPermission.findMany({
    where: { userId },
  });

  // 권한이 없으면 기본 권한 반환
  if (permissions.length === 0) {
    return defaultUserPermissions.map((perm) => ({
      id: '',
      userId,
      resource: perm.resource,
      actions:
        perm.actions === '*'
          ? ['create', 'read', 'update', 'delete']
          : perm.actions,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  return permissions.map((perm) => ({
    ...perm,
    actions: perm.actions as UserAction[],
  }));
};

/**
 * 사용자 권한을 설정합니다.
 */
export const setUserPermission = async (
  userId: string,
  resource: UserResource,
  actions: UserAction[] | '*'
) => {
  const actionsArray =
    actions === '*' ? ['create', 'read', 'update', 'delete'] : actions;

  return await prisma.userPermission.upsert({
    where: {
      userId_resource: {
        userId,
        resource,
      },
    },
    update: {
      actions: actionsArray,
      updatedAt: new Date(),
    },
    create: {
      userId,
      resource,
      actions: actionsArray,
    },
  });
};

/**
 * 사용자 권한을 삭제합니다.
 */
export const deleteUserPermission = async (
  userId: string,
  resource: UserResource
) => {
  return await prisma.userPermission.delete({
    where: {
      userId_resource: {
        userId,
        resource,
      },
    },
  });
};

/**
 * 사용자가 특정 리소스에 대한 액션을 수행할 수 있는지 확인합니다.
 */
export const checkUserPermission = async (
  userId: string,
  resource: UserResource,
  action: UserAction
): Promise<boolean> => {
  const permissions = await getUserPermissions(userId);
  const permission = permissions.find((p) => p.resource === resource);

  if (!permission) {
    return false;
  }

  // 모든 액션 허용
  if (permission.actions.length === 4) {
    return true;
  }

  return permission.actions.includes(action);
};

/**
 * 사용자 권한이 없으면 기본 권한을 생성합니다.
 */
export const ensureDefaultUserPermissions = async (userId: string) => {
  const existingPermissions = await prisma.userPermission.findMany({
    where: { userId },
  });

  if (existingPermissions.length === 0) {
    // 기본 권한 생성
    for (const perm of defaultUserPermissions) {
      const actions =
        perm.actions === '*'
          ? ['create', 'read', 'update', 'delete']
          : perm.actions;

      await prisma.userPermission.create({
        data: {
          userId,
          resource: perm.resource,
          actions,
        },
      });
    }
  }
};
