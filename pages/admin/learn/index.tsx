import { GetServerSidePropsContext } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';

/**
 * This page was three links — Modules, Tracks and Assignments — and nothing
 * else. The admin rail now lists those three destinations directly, so a hop
 * through a menu that repeats the menu buys nothing. The route is kept so
 * existing links and bookmarks still land somewhere.
 */
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  if (!isAdmin(user.role)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  return {
    redirect: { destination: '/admin/learn/modules', permanent: false },
  };
}

export default function AdminLearnPage() {
  return null;
}
