'use client';

import { ChevronsUpDown } from 'lucide-react';
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
  const { data: userData } = useSWR<{
    data: { role: UserRole };
  }>(session?.user?.id ? '/api/users/me' : null, fetcher);

  const userRole = userData?.data?.role;
  const isUserAdmin = userRole ? isAdmin(userRole) : false;

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
              {/* Stays 32px when the rail collapses — globals.css strips the
                  button's padding there so it fills the 32px button instead of
                  overflowing a 16px content box. A 16px avatar is not a face. */}
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
            className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-md border-[var(--warp-rule)] bg-[var(--warp-surface)] p-0"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={6}
          >
            {/* Identity, stated once. Same avatar size as the trigger, so
                opening the menu does not resize the face. */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 border-b border-[var(--warp-rule)] px-3 py-3 text-left">
                <Avatar className="h-9 w-9 rounded-md">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="rounded-md text-xs">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            {/* Icons removed rather than remapped: the set pointed a badge icon
                at Account and sparkles at Badges, so it actively misled. The
                labels are three words long and read fine alone. */}
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem
                className="text-sm"
                onClick={() => router.push('/settings/account')}
              >
                Account
              </DropdownMenuItem>
              {/* <DropdownMenuItem
                className="text-sm"
                onClick={() => router.push('/settings/badges')}
              >
                Badges
              </DropdownMenuItem> */}
              {/* <DropdownMenuItem
                className="text-sm"
                onClick={() => router.push('/settings')}
              >
                Settings
              </DropdownMenuItem> */}
            </DropdownMenuGroup>

            {isUserAdmin && (
              <>
                <DropdownMenuSeparator className="bg-[var(--warp-rule)]" />
                {/* Admin is a different kind of destination from personal
                    settings, so it sits in its own group. */}
                <DropdownMenuGroup className="p-1">
                  <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Admin
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="text-sm"
                    onClick={() => router.push('/admin/dashboard')}
                  >
                    Admin dashboard
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator className="bg-[var(--warp-rule)]" />
            <div className="p-1">
              <DropdownMenuItem className="text-sm" onClick={handleSignOut}>
                Log out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
