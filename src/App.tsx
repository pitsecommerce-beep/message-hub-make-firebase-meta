import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ConversationsPage from '@/pages/crm/ConversationsPage';
import ContactsPage from '@/pages/crm/ContactsPage';
import OrdersPage from '@/pages/crm/OrdersPage';
import AIAgentsPage from '@/pages/crm/AIAgentsPage';
import WarehousePage from '@/pages/wms/WarehousePage';
import AdminPage from '@/pages/admin/AdminPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import type { ReactNode } from 'react';
import type { ModuleAccess, UserRole } from '@/types';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ModuleRoute({ module, children }: { module: ModuleAccess; children: ReactNode }) {
  const { hasModule } = useAuth();
  if (!hasModule(module)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(roles)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/conversations" element={<ModuleRoute module="crm"><ConversationsPage /></ModuleRoute>} />
        <Route path="/contacts" element={<ModuleRoute module="crm"><ContactsPage /></ModuleRoute>} />
        <Route path="/orders" element={<ModuleRoute module="crm"><OrdersPage /></ModuleRoute>} />
        <Route path="/ai-agents" element={<ModuleRoute module="crm"><AIAgentsPage /></ModuleRoute>} />
        <Route path="/warehouse" element={<ModuleRoute module="wms"><WarehousePage /></ModuleRoute>} />
        <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminPage /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute roles={['admin', 'manager']}><SettingsPage /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
