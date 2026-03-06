import { useState } from 'react';
import {
  UserPlus,
  Edit3,
  Trash2,
  Save,
  X,
  Package,
  MessageSquare,
} from 'lucide-react';
import { classNames, getInitials } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AppUser, UserRole, ModuleAccess } from '@/types';

const demoUsers: AppUser[] = [
  {
    uid: 'u1', email: 'admin@messagehub.com', displayName: 'Admin Principal',
    role: 'admin', modules: ['crm', 'wms'], teamId: 'demo-team',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z', isActive: true,
  },
  {
    uid: 'u2', email: 'gerente@empresa.com', displayName: 'Laura Herrera',
    role: 'manager', modules: ['crm', 'wms'], teamId: 'demo-team',
    createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z', isActive: true,
  },
  {
    uid: 'u3', email: 'ventas@empresa.com', displayName: 'Pedro Ramírez',
    role: 'sales_agent', modules: ['crm'], teamId: 'demo-team',
    createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z', isActive: true,
  },
  {
    uid: 'u4', email: 'almacen@empresa.com', displayName: 'José Mendoza',
    role: 'warehouse', modules: ['wms'], teamId: 'demo-team',
    createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z', isActive: true,
  },
];

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  sales_agent: 'Agente de Ventas',
  warehouse: 'Paquetería',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-violet-50 text-violet-700',
  manager: 'bg-blue-50 text-blue-700',
  sales_agent: 'bg-emerald-50 text-emerald-700',
  warehouse: 'bg-amber-50 text-amber-700',
};

export default function AdminPage() {
  const [users, setUsers] = useState(demoUsers);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('sales_agent');
  const [inviteModules, setInviteModules] = useState<ModuleAccess[]>(['crm']);

  const toggleModule = (user: AppUser, mod: ModuleAccess) => {
    if (!editingUser || editingUser.uid !== user.uid) return;
    const mods = editingUser.modules.includes(mod)
      ? editingUser.modules.filter(m => m !== mod)
      : [...editingUser.modules, mod];
    setEditingUser({ ...editingUser, modules: mods });
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    setUsers(prev => prev.map(u => u.uid === editingUser.uid ? editingUser : u));
    setEditingUser(null);
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    const newUser: AppUser = {
      uid: `u-${Date.now()}`,
      email: inviteEmail,
      displayName: inviteEmail.split('@')[0],
      role: inviteRole,
      modules: inviteModules,
      teamId: 'demo-team',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    setUsers(prev => [...prev, newUser]);
    setShowInvite(false);
    setInviteEmail('');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Administración"
        subtitle="Gestiona usuarios, roles y acceso a módulos"
        actions={
          <button onClick={() => setShowInvite(true)} className="btn-primary text-sm flex items-center gap-2">
            <UserPlus size={16} /> Invitar usuario
          </button>
        }
      />

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50">
              <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Usuario</th>
              <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Rol</th>
              <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Módulos</th>
              <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Estado</th>
              <th className="text-right text-xs font-medium text-surface-500 px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                      {getInitials(user.displayName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-800">{user.displayName}</p>
                      <p className="text-xs text-surface-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editingUser?.uid === user.uid ? (
                    <select
                      className="input-field py-1 text-sm w-auto"
                      value={editingUser.role}
                      onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    >
                      <option value="admin">Administrador</option>
                      <option value="manager">Gerente</option>
                      <option value="sales_agent">Agente de Ventas</option>
                      <option value="warehouse">Paquetería</option>
                    </select>
                  ) : (
                    <span className={`badge ${roleColors[user.role]}`}>{roleLabels[user.role]}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {editingUser?.uid === user.uid ? (
                      <>
                        <button
                          onClick={() => toggleModule(user, 'crm')}
                          className={classNames(
                            'badge cursor-pointer transition-colors',
                            editingUser.modules.includes('crm') ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-400'
                          )}
                        >
                          <MessageSquare size={10} className="mr-1" /> CRM
                        </button>
                        <button
                          onClick={() => toggleModule(user, 'wms')}
                          className={classNames(
                            'badge cursor-pointer transition-colors',
                            editingUser.modules.includes('wms') ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-400'
                          )}
                        >
                          <Package size={10} className="mr-1" /> WMS
                        </button>
                      </>
                    ) : (
                      <>
                        {user.modules.includes('crm') && (
                          <span className="badge bg-primary-50 text-primary-600">
                            <MessageSquare size={10} className="mr-1" /> CRM
                          </span>
                        )}
                        {user.modules.includes('wms') && (
                          <span className="badge bg-amber-50 text-amber-600">
                            <Package size={10} className="mr-1" /> WMS
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={user.isActive ? 'badge-success' : 'badge-danger'}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingUser?.uid === user.uid ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={handleSaveUser} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-lg bg-surface-100 text-surface-400 hover:bg-surface-200">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditingUser({ ...user })} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
                        <Edit3 size={14} />
                      </button>
                      {user.role !== 'admin' && (
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-800">Invitar usuario</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded hover:bg-surface-100 text-surface-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="usuario@empresa.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Rol</label>
                <select
                  className="input-field"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                >
                  <option value="manager">Gerente</option>
                  <option value="sales_agent">Agente de Ventas</option>
                  <option value="warehouse">Paquetería</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Módulos</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteModules(prev => prev.includes('crm') ? prev.filter(m => m !== 'crm') : [...prev, 'crm'])}
                    className={classNames(
                      'flex-1 p-3 rounded-lg border text-center transition-colors',
                      inviteModules.includes('crm') ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-500'
                    )}
                  >
                    <MessageSquare size={20} className="mx-auto mb-1" />
                    <span className="text-sm font-medium">CRM</span>
                  </button>
                  <button
                    onClick={() => setInviteModules(prev => prev.includes('wms') ? prev.filter(m => m !== 'wms') : [...prev, 'wms'])}
                    className={classNames(
                      'flex-1 p-3 rounded-lg border text-center transition-colors',
                      inviteModules.includes('wms') ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-surface-200 text-surface-500'
                    )}
                  >
                    <Package size={20} className="mx-auto mb-1" />
                    <span className="text-sm font-medium">WMS</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-surface-200">
              <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleInvite} className="btn-primary flex items-center gap-2">
                <UserPlus size={16} /> Enviar invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
