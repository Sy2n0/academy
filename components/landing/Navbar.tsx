import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'next-i18next';
import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/router';
import env from '@/lib/env';

interface NavbarProps {
  hideAuthButtons?: boolean;
}

export function Navbar({ hideAuthButtons = false }: NavbarProps) {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  // 사용자 이름의 이니셜 생성
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="w-full border-b border-border/30">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Left: HUB ACADEMY */}
          <Link href="/" className="text-2xl font-bold tracking-tight text-foreground hover:text-accent transition-colors">
            HUB ACADEMY
          </Link>

          {/* Right: Avatar or Sign up, Sign in */}
          {!hideAuthButtons && (
            <div className="flex items-center gap-4 mr-12">
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none focus:outline-none">
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                        <AvatarFallback className="bg-muted text-foreground font-mono text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-0">
                    <DropdownMenuLabel className="font-mono text-xs">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard')}
                      className="font-mono text-xs cursor-pointer"
                    >
                      {t('Dashboard') || 'Dashboard'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/account')}
                      className="font-mono text-xs cursor-pointer"
                    >
                      {t('account') || 'Account'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="font-mono text-xs cursor-pointer text-destructive"
                    >
                      {t('sign-out') || 'Sign out'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/auth/login">{t('sign-in')}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/auth/join">{t('sign-up')}</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
