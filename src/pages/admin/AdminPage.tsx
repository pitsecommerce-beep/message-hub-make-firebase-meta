import { useState, useEffect } from 'react';
import { Edit3, Save, X, Package, MessageSquare, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTeamUsers, updateUser, getTeam } from '@/services/firestore';
import { classNames, getInitials } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AppUser, UserRole, ModuleAccess, Team } from '@/types';

const roleLabels: Record<UserRole, string> = { manager: 'Gerente', sales_agent: 'Agente de Ventas', warehouse: 'Paquetería' };
const roleColors: Record<UserRole, string> = { manager: 'bg-blue-50 text-blue-700', sales_agent: 'bg-emerald-50 text-emerald-700', warehouse: 'bg-amber-50 text-amber-700' };

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.teamId) return;
    Promise.all([
      getTeamUsers(user.teamId).catch(() => []),
      getTeam(user.teamId).catch(() => null),
    ]).then(([u, t]) => { setUsers(u); setTeam(t); setLoading(false); });
  }, [user?.teamId]);

  const toggleModule = (mod: ModuleAccess) => {
    if (!editingUser) return;
    const mods = editingUser.modules.includes(mod)
      ? editingUser.modules.filter(m => m !== mod)
      : [...editingUser.modules, mod];
    setEditingUser({ ...editingUser, modules: mods });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    await updateUser(editingUser.uid, { role: editingUser.role, modules: editingUser.modules, updatedAt: new Date().toISOString() });
    setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, role: editingUser.role, modules: editingUser.modules } : u));
    setEditingUser(null);
  };

  const handleCopyCode = () => {
    if (team?.orgCode) { navigator.clipboard.writeText(team.orgCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Equipo" subtitle="Gestiona miembros, roles y acceso" />

      {/* Org Code */}
      {team?.orgCode && (
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-surface-800 mb-1">Código de organización</h3>
              <p className="text-xs text-surface-500">Comparte este código para que nuevos empleados se unan a tu equipo al registrarse.</p>
            </div>
            <button onClick={handleCopyCode} className="flex items-center gap-3 px-5 py-3 rounded-lg bg-white border border-primary-200 hover:bg-primary-50 transition-colors">
              <span className="font-mono text-2xl font-bold text-primary-700 tracking-widest">{team.orgCode}</span>
              {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-surface-400" />}
            </button>
          </div>
        </div>
      )}

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
            {users.map(u => (
              <tr key={u.uid} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">{getInitials(u.displayName)}</div>
                    <div><p className="text-sm font-medium text-surface-800">{u.displayName}</p><p className="text-xs text-surface-400">{u.email}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editingUser?.uid === u.uid ? (
                    <select className="input-field py-1 text-sm w-auto" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}>
                      <option value="manager">Gerente</option>
                      <option value="sales_agent">Agente de Ventas</option>
                      <option value="warehouse">Paquetería</option>
                    </select>
                  ) : (
                    <span className={`badge ${roleColors[u.role] || 'bg-surface-100 text-surface-600'}`}>{roleLabels[u.role] || u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {editingUser?.uid === u.uid ? (
                      <>
                        <button onClick={() => toggleModule('crm')} className={classNames('badge cursor-pointer transition-colors', editingUser.modules.includes('crm') ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-400')}><MessageSquare size={10} className="mr-1" /> CRM</button>
                        <button onClick={() => toggleModule('wms')} className={classNames('badge cursor-pointer transition-colors', editingUser.modules.includes('wms') ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-400')}><Package size={10} className="mr-1" /> WMS</button>
                      </>
                    ) : (
                      <>
                        {(u.modules || []).includes('crm') && <span className="badge bg-primary-50 text-primary-600"><MessageSquare size={10} className="mr-1" /> CRM</span>}
                        {(u.modules || []).includes('wms') && <span className="badge bg-amber-50 text-amber-600"><Package size={10} className="mr-1" /> WMS</span>}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><span className={u.isActive ? 'badge-success' : 'badge-danger'}>{u.isActive ? 'Activo' : 'Inactivo'}</span></td>
                <td className="px-4 py-3 text-right">
                  {editingUser?.uid === u.uid ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={handleSaveUser} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Save size={14} /></button>
                      <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-lg bg-surface-100 text-surface-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingUser({ ...u })} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><Edit3 size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
