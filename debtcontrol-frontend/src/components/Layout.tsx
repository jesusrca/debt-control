import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  BarChart2,
  Settings,
} from 'lucide-react';
import { FAB } from './ui/FAB';
import { SidebarNav } from './SidebarNav';
import type { ReactNode } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/debts', icon: CreditCard, label: 'Deudas' },
  { to: '/transactions', icon: FileText, label: 'Trans.' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const navigate = useNavigate();
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] h-[72px] px-2 flex items-center justify-around z-40 md:hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-full transition-colors min-w-touch min-h-touch ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`
            }
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium mt-1">{label}</span>
          </NavLink>
        ))}
      </nav>
      <FAB onClick={() => navigate('/upload')} />
    </>
  );
}

export function TopNav() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DC</span>
          </div>
          <span className="font-semibold text-[var(--color-text-primary)] text-sm">DebtControl</span>
        </div>
        {!isHome && (
          <NavLink
            to="/settings"
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </NavLink>
        )}
      </div>
    </header>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <SidebarNav />
      <div className="flex-1 flex flex-col">
        <TopNav />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}