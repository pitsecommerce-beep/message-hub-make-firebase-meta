import { useState, useEffect } from 'react';
import { Bot, Plus, Power, PowerOff, Edit3, Trash2, Clock, MessageSquare, Save, X, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAIAgents, createAIAgent, updateAIAgent, deleteAIAgent } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIAgent, AIAgentScope, AIProviderType } from '@/types';

export default function AIAgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAgents = async () => {
    if (!user?.teamId) return;
    const a = await getAIAgents(user.teamId).catch(() => []);
    setAgents(a);
    setLoading(false);
  };

  useEffect(() => { loadAgents(); }, [user?.teamId]);

  const toggleActive = async (agent: AIAgent) => {
    if (!user?.teamId) return;
    await updateAIAgent(user.teamId, agent.id, { isActive: !agent.isActive });
    loadAgents();
  };

  const handleNew = () => {
    setEditingAgent({
      id: '', teamId: user?.teamId || '', name: '', providerId: '', systemPrompt: '',
      isActive: false, scope: 'all', selectedConversationIds: [], useBusinessHours: true,
      maxTokens: 500, temperature: 0.7, createdAt: '', updatedAt: '',
    });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editingAgent || !user?.teamId) return;
    const now = new Date().toISOString();
    if (isNew) {
      await createAIAgent(user.teamId, { ...editingAgent, teamId: user.teamId, createdAt: now, updatedAt: now });
    } else {
      await updateAIAgent(user.teamId, editingAgent.id, { ...editingAgent, updatedAt: now });
    }
    setEditingAgent(null);
    loadAgents();
  };

  const handleDelete = async (id: string) => {
    if (!user?.teamId) return;
    await deleteAIAgent(user.teamId, id);
    loadAgents();
  };

  const providers: { value: AIProviderType; label: string }[] = [
    { value: 'openai', label: 'OpenAI (GPT)' }, { value: 'anthropic', label: 'Anthropic (Claude)' }, { value: 'custom', label: 'Personalizado' },
  ];
  const scopes: { value: AIAgentScope; label: string; desc: string }[] = [
    { value: 'all', label: 'Todas', desc: 'Responde en todas' }, { value: 'selected', label: 'Seleccionadas', desc: 'Solo específicas' }, { value: 'none', label: 'Ninguna', desc: 'Desactivado' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Agentes de IA" subtitle="Configura agentes para atender conversaciones automáticamente"
        actions={<button onClick={handleNew} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Nuevo agente</button>} />

      {agents.length === 0 ? (
        <div className="card p-8 text-center"><Bot size={40} className="mx-auto mb-3 text-surface-300" /><h3 className="text-sm font-semibold text-surface-700 mb-1">Sin agentes</h3><p className="text-xs text-surface-400">Crea tu primer agente de IA para automatizar respuestas.</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {agents.map(agent => (
            <div key={agent.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={classNames('w-10 h-10 rounded-lg flex items-center justify-center', agent.isActive ? 'bg-violet-100 text-violet-600' : 'bg-surface-100 text-surface-400')}><Bot size={20} /></div>
                  <div><h3 className="text-sm font-semibold text-surface-800">{agent.name}</h3><p className="text-xs text-surface-400">{agent.providerId}</p></div>
                </div>
                <button onClick={() => toggleActive(agent)} className={classNames('p-2 rounded-lg transition-colors', agent.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-400')}>
                  {agent.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
              </div>
              <p className="text-xs text-surface-500 mb-3 line-clamp-2">{agent.systemPrompt}</p>
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-4">
                <span className="flex items-center gap-1"><MessageSquare size={12} />{agent.scope === 'all' ? 'Todas' : agent.scope === 'selected' ? 'Seleccionadas' : 'Ninguna'}</span>
                <span className="flex items-center gap-1"><Clock size={12} />{agent.useBusinessHours ? 'Horario' : 'Siempre'}</span>
                <span className="flex items-center gap-1"><Zap size={12} />T: {agent.temperature}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingAgent({ ...agent }); setIsNew(false); }} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><Edit3 size={12} /> Editar</button>
                <button onClick={() => handleDelete(agent.id)} className="btn-ghost text-xs py-1.5 text-red-500 hover:bg-red-50 flex items-center gap-1"><Trash2 size={12} /> Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingAgent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-800">{isNew ? 'Nuevo agente' : 'Editar agente'}</h2>
              <button onClick={() => setEditingAgent(null)} className="p-1 rounded hover:bg-surface-100 text-surface-400"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Nombre</label><input type="text" className="input-field" placeholder="Ej: Asistente de Ventas" value={editingAgent.name} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Proveedor</label><select className="input-field" value={editingAgent.providerId} onChange={e => setEditingAgent({ ...editingAgent, providerId: e.target.value })}><option value="">Seleccionar</option>{providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">System Prompt</label><textarea className="input-field min-h-[120px] resize-y" placeholder="Define el comportamiento..." value={editingAgent.systemPrompt} onChange={e => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-2">Alcance</label><div className="grid grid-cols-3 gap-2">{scopes.map(s => (<button key={s.value} onClick={() => setEditingAgent({ ...editingAgent, scope: s.value })} className={classNames('p-3 rounded-lg border text-left transition-colors', editingAgent.scope === s.value ? 'border-primary-300 bg-primary-50' : 'border-surface-200 hover:border-surface-300')}><p className="text-sm font-medium text-surface-800">{s.label}</p><p className="text-xs text-surface-400 mt-0.5">{s.desc}</p></button>))}</div></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-primary-500" checked={editingAgent.useBusinessHours} onChange={e => setEditingAgent({ ...editingAgent, useBusinessHours: e.target.checked })} /><span className="text-sm text-surface-700">Solo horario comercial</span></label>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-surface-700 mb-1">Max Tokens</label><input type="number" className="input-field" value={editingAgent.maxTokens} onChange={e => setEditingAgent({ ...editingAgent, maxTokens: Number(e.target.value) })} min={100} max={4000} /></div>
                <div><label className="block text-sm font-medium text-surface-700 mb-1">Temperatura: {editingAgent.temperature}</label><input type="range" className="w-full mt-2" min={0} max={1} step={0.1} value={editingAgent.temperature} onChange={e => setEditingAgent({ ...editingAgent, temperature: Number(e.target.value) })} /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-surface-200">
              <button onClick={() => setEditingAgent(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={16} /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
