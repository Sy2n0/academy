import { ApiError } from '@/lib/errors';
import { Action, Resource, permissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { Role, TeamMember } from '@prisma/client';
import type { Session } from 'next-auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { maxLengthPolicies } from '@/lib/common';
import type { UserAction, UserResource } from '@/lib/user-permissions';

export const normalizeUser = (user) => {
  if (user?.name) {
    user.name = user.name.substring(0, maxLengthPolicies.name);
  }

  return user;
};

export const createUser = async (data: {
  name: string;
  email: string;
  password?: string;
  emailVerified?: Date | null;
}) => {
  return await prisma.user.create({
    data: normalizeUser(data),
  });
};

export const updateUser = async ({ where, data }) => {
  data = normalizeUser(data);

  return await prisma.user.update({
    where,
    data,
  });
};

export const upsertUser = async ({ where, update, create }) => {
  update = normalizeUser(update);
  create = normalizeUser(create);

  return await prisma.user.upsert({
    where,
    update,
    create,
  });
};

export const getUser = async (key: { id: string } | { email: string }) => {
  const user = await prisma.user.findUnique({
    where: key,
  });

  return normalizeUser(user);
};

export const getUserBySession = async (session: Session | null) => {
  if (session === null || session.user === null) {
    return null;
  }

  const id = session?.user?.id;

  if (!id) {
    return null;
  }

  const user = await getUser({ id });

  // A blocked account is treated as no account. Every caller already handles a
  // null user by returning 401 or redirecting, so this needs no new branch at
  // the 115 call sites — and it adds no query, since the lookup already ran.
  if (user?.isBlocked) {
    return null;
  }

  return user;
};

export const deleteUser = async (key: { id: string } | { email: string }) => {
  return await prisma.user.delete({
    where: key,
  });
};

export const findFirstUserOrThrow = async ({ where }) => {
  const user = await prisma.user.findFirstOrThrow({
    where,
  });

  return normalizeUser(user);
};

const isAllowed = (role: Role, resource: Resource, action: Action) => {
  const rolePermissions = permissions[role];

  if (!rolePermissions) {
    return false;
  }

  for (const permission of rolePermissions) {
    if (
      permission.resource === resource &&
      (permission.actions === '*' || permission.actions.includes(action))
    ) {
      return true;
    }
  }

  return false;
};

export const throwIfNotAllowed = (
  user: Pick<TeamMember, 'role'>,
  resource: Resource,
  action: Action
) => {
  if (isAllowed(user.role, resource, action)) {
    return true;
  }

  throw new ApiError(
    403,
    `You are not allowed to perform ${action} on ${resource}`
  );
};

// 개인 권한 체크 함수
export const throwIfUserNotAllowed = async (
  userId: string,
  resource: string,
  action: string
) => {
  const { checkUserPermission } = await import('models/userPermission');

  const hasPermission = await checkUserPermission(
    userId,
    resource as UserResource,
    action as UserAction
  );

  if (!hasPermission) {
    throw new ApiError(
      403,
      `You are not allowed to perform ${action} on ${resource}`
    );
  }

  return true;
};

// Get current user from session
export const getCurrentUser = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const session = await getSession(req, res);

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
};
