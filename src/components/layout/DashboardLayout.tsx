import { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  LogOut,
  Building2,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type NavItem = {
  title: string;
  href: string;
  icon: any;
};

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Документы', href: '/documents', icon: FileText },
  { title: 'Транзакции', href: '/transactions', icon: CreditCard },
  { title: 'Проводки', href: '/entries', icon: Receipt },
  { title: 'Отчёты', href: '/reports', icon: BarChart3 },
  { title: 'Помощник', href: '/assistant', icon: MessageSquare },
  { title: 'Настройки', href: '/settings', icon: Settings },
];

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const { currentCompany } = useCompany();
  const currentPath = window.location.pathname;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast.success('Вы вышли из системы');
    } catch (error: any) {
      toast.error('Ошибка выхода');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              Sana
            </h1>
          </div>
          
          {currentCompany && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-light">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{currentCompany.name}</span>
            </div>
          )}

          {isDemoMode ? (
            <Link to="/auth">
              <Button variant="default" size="sm">
                Войти / Регистрация
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          )}
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="container px-4 py-6">
        {isDemoMode && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg text-center">
            <p className="text-sm">
              💡 Это демо-версия Sana. <Link to="/auth" className="underline font-medium text-primary hover:text-primary-hover">Создайте аккаунт</Link> для полного доступа ко всем функциям.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;
              
              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start transition-base',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary-hover'
                  )}
                  onClick={() => navigate(item.href)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              );
            })}
          </nav>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
