import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/debts', icon: CreditCard, label: 'Deudas' },
  { to: '/transactions', icon: FileText, label: 'Transacciones' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export function SidebarNav() {
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`hidden lg:flex flex-col bg-dcdark-surface border-r border-dcdark-border transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center h-16 px-4 border-b border-dcdark-border">
        <div className="w-8 h-8 bg-dcdark-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-black font-bold text-xs">DC</span>
        </div>
        {!collapsed && (
          <span className="ml-2 font-semibold text-dcdark-text-primary text-sm whitespace-nowrap">
            DebtControl
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center h-12 rounded-lg transition-colors ${
                    collapsed ? 'justify-center px-2' : 'px-4 gap-3'
                  } ${
                    isActive
                      ? 'bg-dcdark-primary/10 text-dcdark-primary'
                      : 'text-dcdark-text-secondary hover:bg-dcdark-surface-hover hover:text-dcdark-text-primary'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-2 border-t border-dcdark-border flex gap-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center flex-1 h-10 rounded-lg text-dcdark-text-secondary hover:bg-dcdark-surface-hover hover:text-dcdark-text-primary transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center flex-1 h-10 rounded-lg text-dcdark-text-secondary hover:bg-dcdark-surface-hover hover:text-dcdark-danger transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}