import { UserRole } from '@prisma/client';

export const userRoles = [
  {
    id: UserRole.USER,
    name: 'User',
    description: '일반 사용자',
  },
  {
    id: UserRole.LAB,
    name: 'Lab',
    description: '연구실 사용자',
  },
  {
    id: UserRole.ADMIN,
    name: 'Admin',
    description: '관리자',
  },
];

/**
 * 사용자가 관리자 권한을 가지고 있는지 확인
 */
export const isAdmin = (role: UserRole): boolean => {
  return role === UserRole.ADMIN;
};

/**
 * 사용자가 Lab 권한 이상을 가지고 있는지 확인
 */
export const isLabOrAbove = (role: UserRole): boolean => {
  return role === UserRole.LAB || role === UserRole.ADMIN;
};

/**
 * 사용자가 특정 역할 이상의 권한을 가지고 있는지 확인
 */
export const hasRoleOrAbove = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  const roleHierarchy = {
    [UserRole.USER]: 1,
    [UserRole.LAB]: 2,
    [UserRole.ADMIN]: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
