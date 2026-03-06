import { useState, useEffect } from 'react';
import { Bot, Link2, MessageSquare, Phone, Instagram, Unlink, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAIAgents, getTeam, updateTeam } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIAgent, Team, MessagePlatform, ChannelConnection } from '@/types';

const channels: { platform: MessagePlatform; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { platform: 'whatsapp', label: 'WhatsApp', icon: <Phone size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { platform: 'messenger', label: 'Messenger', icon: <MessageSquare size={24} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { platform: 'instagram', label: 'Instagram', icon: <Instagram size={24} />, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
];

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingChannel, setEditingChannel] = useState<MessagePlatform | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  useEffect(() => {
    if (!user?.teamId) return;
    Promise.all([
      getAIAgents(user.teamId).catch(() => []),
      getTeam(user.teamId).catch(() => null),
    ]).then(([a, t]) => {
      setAgents(a);
      setTeam(t);
      setConnections(t?.settings?.channelConnections || []);
      setLoading(false);
    });
  }, [user?.teamId]);

  const getConnection = (platform: MessagePlatform) => connections.find(c => c.platform === platform);
  const getAgent = (agentId?: string) => agents.find(a => a.id === agentId);

  const handleAssignAgent = async (platform: MessagePlatform) => {
    if (!user?.teamId || !team) return;
    setSaving(true);
    const existing = connections.filter(c => c.platform !== platform);
    const newConn: ChannelConnection = {
      id: `conn-${platform}`,
      platform,
      agentId: selectedAgentId || undefined,
      isActive: true,
    };
    const updated = [...existing, newConn];
    setConnections(updated);
    await updateTeam(user.teamId, { 'settings.channelConnections': updated } as Partial<Team>).catch(() => {});
    setSaving(false);
    setEditingChannel(null);
    setSelectedAgentId('');
  };

  const handleDisconnect = async (platform: MessagePlatform) => {
    if (!user?.teamId) return;
    const updated = connections.filter(c => c.platform !== platform);
    setConnections(updated);
    await updateTeam(user.teamId, { 'settings.channelConnections': updated } as Partial<Team>).catch(() => {});
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Conexiones" subtitle="Conecta tus canales de Meta con agentes de IA" />

      {/* Visual connection diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {channels.map((ch) => {
          const conn = getConnection(ch.platform);
          const agent = getAgent(conn?.agentId);

          return (
            <div key={ch.platform} className={classNames('card p-6 border-2 transition-all duration-300', conn?.isActive ? ch.bg : 'border-surface-200')}>
              {/* Channel header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={classNames('w-12 h-12 rounded-xl flex items-center justify-center', conn?.isActive ? ch.bg : 'bg-surface-100')}>
                  <span className={conn?.isActive ? ch.color : 'text-surface-400'}>{ch.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-800">{ch.label}</h3>
                  <p className="text-xs text-surface-500">
                    {conn?.isActive ? 'Conectado' : 'Sin conectar'}
                  </p>
                </div>
              </div>

              {/* Connection arrow & agent */}
              {conn?.isActive && agent && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-surface-200" />
                    <ArrowRight size={14} className="text-surface-400" />
                    <div className="flex-1 h-px bg-surface-200" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-surface-200">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{agent.name}</p>
                      <p className="text-xs text-surface-400">{agent.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>
                    <Check size={16} className="text-emerald-500" />
                  </div>
                </div>
              )}

              {conn?.isActive && !agent && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700">Canal conectado sin agente asignado. Los mensajes se recibirán pero no se responderán automáticamente.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {conn?.isActive ? (
                  <>
                    <button onClick={() => { setEditingChannel(ch.platform); setSelectedAgentId(conn.agentId || ''); }}
                      className="btn-secondary text-xs py-1.5 flex-1 flex items-center justify-center gap-1">
                      <Link2 size={12} /> Cambiar agente
                    </button>
                    <button onClick={() => handleDisconnect(ch.platform)}
                      className="btn-ghost text-xs py-1.5 text-red-500 hover:bg-red-50 flex items-center justify-center gap-1">
                      <Unlink size={12} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setEditingChannel(ch.platform); setSelectedAgentId(''); }}
                    className="btn-primary text-xs py-2 w-full flex items-center justify-center gap-1">
                    <Link2 size={12} /> Conectar canal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Overview */}
      {agents.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Bot size={16} className="text-violet-500" /> Resumen de agentes
          </h3>
          <div className="space-y-3">
            {agents.map(agent => {
              const connectedChannels = connections.filter(c => c.agentId === agent.id && c.isActive);
              return (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                  <div className="flex items-center gap-3">
                    <div className={classNames('w-9 h-9 rounded-lg flex items-center justify-center', agent.isActive ? 'bg-violet-100 text-violet-600' : 'bg-surface-200 text-surface-400')}>
                      <Bot size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-800">{agent.name}</p>
                      <p className="text-xs text-surface-400">{agent.providerId} - {agent.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connectedChannels.length === 0 ? (
                      <span className="text-xs text-surface-400">Sin canales</span>
                    ) : (
                      connectedChannels.map(c => {
                        const ch = channels.find(x => x.platform === c.platform);
                        return ch ? (
                          <span key={c.platform} className={classNames('w-7 h-7 rounded-lg flex items-center justify-center', ch.bg)}>
                            <span className={ch.color}>{<span className="scale-75 inline-flex">{ch.icon}</span>}</span>
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {agents.length === 0 && (
        <div className="card p-8 text-center">
          <Bot size={40} className="mx-auto mb-3 text-surface-300" />
          <h3 className="text-sm font-semibold text-surface-700 mb-1">Crea un agente primero</h3>
          <p className="text-xs text-surface-400">Ve a "Agentes IA" para crear un agente antes de asignarlo a un canal.</p>
        </div>
      )}

      {/* Assign Agent Modal */}
      {editingChannel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-800">
                Asignar agente a {channels.find(c => c.platform === editingChannel)?.label}
              </h2>
              <p className="text-sm text-surface-500 mt-1">Selecciona qué agente atenderá este canal</p>
            </div>
            <div className="p-5 space-y-3">
              <div
                onClick={() => setSelectedAgentId('')}
                className={classNames('p-3 rounded-lg border-2 cursor-pointer transition-colors', !selectedAgentId ? 'border-primary-300 bg-primary-50' : 'border-surface-200 hover:border-surface-300')}>
                <p className="text-sm font-medium text-surface-800">Sin agente</p>
                <p className="text-xs text-surface-400">Solo recibir mensajes, sin respuesta automática</p>
              </div>
              {agents.map(agent => (
                <div key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={classNames('p-3 rounded-lg border-2 cursor-pointer transition-colors flex items-center gap-3', selectedAgentId === agent.id ? 'border-primary-300 bg-primary-50' : 'border-surface-200 hover:border-surface-300')}>
                  <div className={classNames('w-9 h-9 rounded-lg flex items-center justify-center', agent.isActive ? 'bg-violet-100 text-violet-600' : 'bg-surface-200 text-surface-400')}>
                    <Bot size={18} />
                  </div>
                  <div><p className="text-sm font-medium text-surface-800">{agent.name}</p><p className="text-xs text-surface-400">{agent.providerId}</p></div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-surface-200">
              <button onClick={() => setEditingChannel(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => handleAssignAgent(editingChannel)} disabled={saving}
                className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
