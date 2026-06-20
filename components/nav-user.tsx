'use client';

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { UserRole } from '@prisma/client';
import { isAdmin } from '@/lib/user-roles';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

// 사용자 이름의 이니셜 생성
const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function NavUser() {
  const { isMobile } = useSidebar();
  const { data: session } = useSession();
  const router = useRouter();

  const user = session?.user;
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.image || undefined;

  // Fetch user role
  const { data: userData, error: userError } = useSWR<{
    data: { role: UserRole };
  }>(session?.user?.id ? '/api/users/me' : null, fetcher);

  const userRole = userData?.data?.role;
  const isUserAdmin = userRole ? isAdmin(userRole) : false;

  // Debug logging (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log(
      'NavUser - userRole:',
      userRole,
      'isUserAdmin:',
      isUserAdmin,
      'userData:',
      userData,
      'userEmail:',
      userEmail
    );
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs">{userEmail}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push('/settings/account')}
              >
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings/badges')}>
                <Sparkles />
                Badges
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings />
                Settings
              </DropdownMenuItem>
              {isUserAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={() => router.push('/admin/dashboard')}
                  >
                    <Shield />
                    Admin
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={() => router.push('/admin/badges')}>
                    <Sparkles />
                    Badge Admin
                  </DropdownMenuItem> */}
                </>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
