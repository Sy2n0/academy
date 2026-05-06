export type UserAction = 'create' | 'update' | 'read' | 'delete';
export type UserResource =
  | 'account'
  | 'profile'
  | 'score'
  | 'api_key'
  | 'session'
  | 'settings';

export type UserPermission = {
  resource: UserResource;
  actions: UserAction[] | '*';
};

// 기본 개인 권한: 모든 사용자는 자신의 계정에 대한 모든 권한을 가짐
export const defaultUserPermissions: UserPermission[] = [
  {
    resource: 'account',
    actions: '*',
  },
  {
    resource: 'profile',
    actions: '*',
  },
  {
    resource: 'score',
    actions: ['read'],
  },
  {
    resource: 'api_key',
    actions: ['create', 'read', 'delete'],
  },
  {
    resource: 'session',
    actions: ['read', 'delete'],
  },
  {
    resource: 'settings',
    actions: '*',
  },
];

/**
 * 사용자가 특정 리소스에 대한 액션을 수행할 수 있는지 확인
 */
export const isUserActionAllowed = (
  userPermissions: UserPermission[],
  resource: UserResource,
  action: UserAction
): boolean => {
  const permission = userPermissions.find((p) => p.resource === resource);

  if (!permission) {
    return false;
  }

  if (permission.actions === '*') {
    return true;
  }

  return permission.actions.includes(action);
};

/**
 * 사용자 권한을 문자열 배열에서 UserPermission 배열로 변환
 */
export const parseUserPermissions = (
  permissions: { resource: string; actions: string[] }[]
): UserPermission[] => {
  return permissions.map((p) => ({
    resource: p.resource as UserResource,
    actions: p.actions as UserAction[],
  }));
};
