import { NavLink } from 'react-router-dom';
import { MessageSquare, Users, ShoppingCart, Bot, Package, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Link2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { classNames } from '@/utils/helpers';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  module?: 'crm' | 'wms';
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Conversaciones', path: '/conversations', icon: <MessageSquare size={20} />, module: 'crm' },
  { label: 'Contactos', path: '/contacts', icon: <Users size={20} />, module: 'crm' },
  { label: 'Pedidos', path: '/orders', icon: <ShoppingCart size={20} />, module: 'crm' },
  { label: 'Agentes IA', path: '/ai-agents', icon: <Bot size={20} />, module: 'crm' },
  { label: 'Conexiones', path: '/connections', icon: <Link2 size={20} />, module: 'crm' },
  { label: 'Almacén', path: '/warehouse', icon: <Package size={20} />, module: 'wms' },
  { label: 'Equipo', path: '/team', icon: <UsersRound size={20} />, roles: ['manager'] },
  { label: 'Configuración', path: '/settings', icon: <Settings size={20} />, roles: ['manager'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, hasModule, hasRole } = useAuth();

  const filteredItems = navItems.filter(item => {
    if (item.module && !hasModule(item.module)) return false;
    if (item.roles && !hasRole(item.roles as never[])) return false;
    return true;
  });

  return (
    <aside className={classNames('h-screen bg-white border-r border-surface-200 flex flex-col transition-all duration-200 sticky top-0', collapsed ? 'w-16' : 'w-60')}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-surface-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <span className="font-semibold text-surface-800 text-sm">MessageHub</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => classNames('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150', isActive ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-50 hover:text-surface-800')}
            title={collapsed ? item.label : undefined}>
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-surface-200 p-3">
        <div className={classNames('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {user?.displayName?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-800 truncate">{user?.displayName}</p>
              <p className="text-xs text-surface-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
