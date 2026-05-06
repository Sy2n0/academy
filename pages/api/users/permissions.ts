import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { getUserPermissions, setUserPermission, deleteUserPermission } from 'models/userPermission';
import { UserResource, UserAction, defaultUserPermissions } from '@/lib/user-permissions';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';

const setPermissionSchema = z.object({
  resource: z.string(),
  actions: z.union([
    z.literal('*'),
    z.array(z.enum(['create', 'read', 'update', 'delete'])),
  ]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(req, res, user.id);
        break;
      case 'PUT':
        await handlePUT(req, res, user.id);
        break;
      case 'DELETE':
        await handleDELETE(req, res, user.id);
        break;
      default:
        res.setHeader('Allow', 'GET, PUT, DELETE');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

// Get user permissions
const handleGET = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const permissions = await getUserPermissions(userId);

  res.json({
    data: permissions.map((p) => ({
      resource: p.resource,
      actions: p.actions,
    })),
  });
};

// Set user permission
const handlePUT = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { resource, actions } = setPermissionSchema.parse(req.body);

  await setUserPermission(
    userId,
    resource as UserResource,
    actions === '*' ? '*' : (actions as UserAction[])
  );

  res.json({
    data: {
      resource,
      actions,
    },
  });
};

// Delete user permission (revert to default)
const handleDELETE = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { resource } = req.query;

  if (!resource || typeof resource !== 'string') {
    throw new ApiError(400, 'Resource is required');
  }

  await deleteUserPermission(userId, resource as UserResource);

  res.json({
    data: {
      message: 'Permission deleted',
    },
  });
};
