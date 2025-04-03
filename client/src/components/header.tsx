import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Home, History, LayoutDashboard, LogOut, Settings, Menu } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  if (!user) return null;
  
  // Get user initials from first and last name
  const getInitials = () => {
    if (!user) return 'CC';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };
  
  const getNavItemClass = (path: string) => {
    return `flex items-center ${location === path ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors font-medium`;
  };

  return (
    <header className="bg-background border-b border-border z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center mr-3">
              <span className="text-white text-xl font-bold">CC</span>
            </div>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              CoupleClarity
            </h1>
          </div>
        </Link>
        
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                    <span className="font-medium text-sm">{getInitials()}</span>
                  </div>
                  <div>
                    <p className="font-medium">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">
                  <div className="flex w-full items-center">
                    <Home className="mr-2 h-4 w-4" /> Home
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/history">
                  <div className="flex w-full items-center">
                    <History className="mr-2 h-4 w-4" /> History
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <div className="flex w-full items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <div className="flex w-full items-center">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center space-x-6">
            <nav className="flex items-center space-x-6 mr-4">
              <Link href="/">
                <div className={getNavItemClass('/')}>
                  <Home className="h-4 w-4 mr-1" />
                  <span>Home</span>
                </div>
              </Link>
              <Link href="/history">
                <div className={getNavItemClass('/history')}>
                  <History className="h-4 w-4 mr-1" />
                  <span>History</span>
                </div>
              </Link>
              <Link href="/dashboard">
                <div className={getNavItemClass('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  <span>Dashboard</span>
                </div>
              </Link>
            </nav>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                    <span className="font-medium text-sm">{getInitials()}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <div className="flex w-full items-center">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
