import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Power, PowerOff, Edit3, Trash2, Clock, MessageSquare, Save, X, Send, Loader2, ChevronRight, Settings2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAIAgents, createAIAgent, updateAIAgent, deleteAIAgent, getTeam } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIAgent, AIAgentScope, Team } from '@/types';

type TestMessage = { role: 'user' | 'assistant'; content: string };

export default function AIAgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testingAgent, setTestingAgent] = useState<AIAgent | null>(null);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'behavior' | 'advanced'>('basic');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!user?.teamId) return;
    const [a, t] = await Promise.all([
      getAIAgents(user.teamId).catch(() => []),
      getTeam(user.teamId).catch(() => null),
    ]);
    setAgents(a);
    setTeam(t);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.teamId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testMessages]);

  const toggleActive = async (agent: AIAgent) => {
    if (!user?.teamId) return;
    await updateAIAgent(user.teamId, agent.id, { isActive: !agent.isActive });
    loadData();
  };

  const handleNew = () => {
    setEditingAgent({
      id: '', teamId: user?.teamId || '', name: '', providerId: 'openai', systemPrompt: '',
      isActive: false, scope: 'all', selectedConversationIds: [], useBusinessHours: true,
      maxTokens: 500, temperature: 0.7, createdAt: '', updatedAt: '',
    });
    setIsNew(true);
    setActiveSection('basic');
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
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!user?.teamId) return;
    await deleteAIAgent(user.teamId, id);
    loadData();
  };

  const startTest = (agent: AIAgent) => {
    setTestingAgent(agent);
    setTestMessages([]);
    setTestInput('');
  };

  const sendTestMessage = async () => {
    if (!testInput.trim() || !testingAgent || !team) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTestLoading(true);

    const provider = team.settings?.aiProviders?.find(p => p.provider === testingAgent.providerId || p.id === testingAgent.providerId);

    if (!provider?.apiKey) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: 'No se encontro un proveedor de IA configurado con API Key. Ve a Configuracion > Proveedores IA para agregar uno.' }]);
      setTestLoading(false);
      return;
    }

    try {
      let apiUrl = '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: Record<string, unknown> = {};

      if (provider.provider === 'openai' || provider.provider === 'custom') {
        apiUrl = provider.baseUrl ? `${provider.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
        body = {
          model: provider.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: testingAgent.systemPrompt || 'Eres un asistente util.' },
            ...testMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg },
          ],
          max_tokens: testingAgent.maxTokens,
          temperature: testingAgent.temperature,
        };
      } else if (provider.provider === 'anthropic') {
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        body = {
          model: provider.model || 'claude-sonnet-4-20250514',
          system: testingAgent.systemPrompt || 'Eres un asistente util.',
          messages: [
            ...testMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg },
          ],
          max_tokens: testingAgent.maxTokens,
        };
      }

      const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await resp.json();

      let reply = '';
      if (provider.provider === 'anthropic') {
        reply = data.content?.[0]?.text || data.error?.message || 'Sin respuesta';
      } else {
        reply = data.choices?.[0]?.message?.content || data.error?.message || 'Sin respuesta';
      }

      setTestMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'No se pudo conectar con el proveedor de IA'}` }]);
    }
    setTestLoading(false);
  };

  const scopes: { value: AIAgentScope; label: string; desc: string }[] = [
    { value: 'all', label: 'Todas las conversaciones', desc: 'Responde automaticamente en todas' },
    { value: 'selected', label: 'Solo conversaciones seleccionadas', desc: 'Elige en cuales responde' },
    { value: 'none', label: 'Desactivado', desc: 'No responde automaticamente' },
  ];

  const getCreativityLabel = (temp: number) => {
    if (temp <= 0.15) return 'Muy preciso';
    if (temp <= 0.4) return 'Preciso';
    if (temp <= 0.6) return 'Balanceado';
    if (temp <= 0.85) return 'Creativo';
    return 'Muy creativo';
  };

  const providerOptions = [
    ...(team?.settings?.aiProviders || []).map(p => ({ value: p.id, label: `${p.name || p.provider} (${p.model || p.provider})` })),
    { value: 'openai', label: 'OpenAI (por defecto)' },
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'custom', label: 'Proveedor personalizado' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Agente de IA" subtitle="Configura tu asistente inteligente para responder conversaciones"
        actions={<button onClick={handleNew} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Nuevo agente</button>} />

      {(!team?.settings?.aiProviders || team.settings.aiProviders.length === 0) && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Settings2 size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Configura un proveedor de IA primero</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Ve a Configuracion {'>'} Proveedores IA para agregar tu API Key de OpenAI, Anthropic u otro proveedor.</p>
            </div>
          </div>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-violet-500" />
          </div>
          <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200 mb-2">Crea tu primer agente de IA</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto mb-4">Un agente de IA puede responder automaticamente a tus clientes por WhatsApp, Messenger o Instagram.</p>
          <button onClick={handleNew} className="btn-primary inline-flex items-center gap-2"><Sparkles size={16} /> Crear agente</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {agents.map(agent => (
            <div key={agent.id} className="card p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={classNames('w-10 h-10 rounded-lg flex items-center justify-center', agent.isActive ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-surface-100 dark:bg-surface-700 text-surface-400')}><Bot size={20} /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">{agent.name}</h3>
                    <p className="text-xs text-surface-400">{getCreativityLabel(agent.temperature)} - {agent.scope === 'all' ? 'Todas las conversaciones' : agent.scope === 'selected' ? 'Conversaciones seleccionadas' : 'Desactivado'}</p>
                  </div>
                </div>
                <button onClick={() => toggleActive(agent)} className={classNames('p-2 rounded-lg transition-colors', agent.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-100 dark:bg-surface-700 text-surface-400')}>
                  {agent.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mb-3 line-clamp-2">{agent.systemPrompt || 'Sin instrucciones configuradas'}</p>
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-4">
                <span className="flex items-center gap-1"><Clock size={12} />{agent.useBusinessHours ? 'Horario comercial' : 'Siempre activo'}</span>
                <span className={classNames('px-2 py-0.5 rounded-full', agent.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-100 dark:bg-surface-700')}>{agent.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingAgent({ ...agent }); setIsNew(false); setActiveSection('basic'); }} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><Edit3 size={12} /> Editar</button>
                <button onClick={() => startTest(agent)} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><MessageSquare size={12} /> Probar</button>
                <button onClick={() => handleDelete(agent.id)} className="btn-ghost text-xs py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"><Trash2 size={12} /> Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">{isNew ? 'Crear agente' : 'Editar agente'}</h2>
              <button onClick={() => setEditingAgent(null)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={20} /></button>
            </div>

            {/* Section tabs */}
            <div className="flex border-b border-surface-200 dark:border-surface-700 px-5">
              {[
                { id: 'basic' as const, label: 'Informacion basica' },
                { id: 'behavior' as const, label: 'Comportamiento' },
                { id: 'advanced' as const, label: 'Opciones avanzadas' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={classNames(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeSection === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {activeSection === 'basic' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Nombre de tu agente</label>
                    <input type="text" className="input-field" placeholder="Ej: Asistente de Ventas, Soporte 24/7..." value={editingAgent.name} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Proveedor de IA</label>
                    <select className="input-field" value={editingAgent.providerId} onChange={e => setEditingAgent({ ...editingAgent, providerId: e.target.value })}>
                      <option value="">Seleccionar proveedor...</option>
                      {providerOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <p className="text-xs text-surface-400 mt-1">Agrega proveedores en Configuracion {'>'} Proveedores IA</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Instrucciones del agente</label>
                    <p className="text-xs text-surface-400 mb-2">Describe como quieres que se comporte tu agente. Que personalidad tiene? Que informacion debe dar? Que no debe hacer?</p>
                    <textarea className="input-field min-h-[150px] resize-y" placeholder="Ej: Eres un asistente amable de ventas para [tu empresa]. Ayudas a los clientes con informacion de productos, precios y disponibilidad. Siempre saludas cordialmente y ofreces ayuda adicional..." value={editingAgent.systemPrompt} onChange={e => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })} />
                  </div>
                </>
              )}

              {activeSection === 'behavior' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">En que conversaciones responde?</label>
                    <div className="space-y-2">
                      {scopes.map(s => (
                        <button key={s.value} type="button" onClick={() => setEditingAgent({ ...editingAgent, scope: s.value })}
                          className={classNames('w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200',
                            editingAgent.scope === s.value ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300')}>
                          <div className={classNames('w-4 h-4 rounded-full border-2 flex items-center justify-center',
                            editingAgent.scope === s.value ? 'border-primary-500' : 'border-surface-300 dark:border-surface-600')}>
                            {editingAgent.scope === s.value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{s.label}</p>
                            <p className="text-xs text-surface-400">{s.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-surface-300 transition-colors">
                    <input type="checkbox" className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-500" checked={editingAgent.useBusinessHours} onChange={e => setEditingAgent({ ...editingAgent, useBusinessHours: e.target.checked })} />
                    <div>
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Solo responder en horario comercial</span>
                      <p className="text-xs text-surface-400">Configura tu horario en Configuracion {'>'} Horario</p>
                    </div>
                  </label>
                </>
              )}

              {activeSection === 'advanced' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Largo maximo de respuesta</label>
                    <p className="text-xs text-surface-400 mb-2">Cuantas palabras aproximadas puede usar el agente para responder</p>
                    <div className="flex items-center gap-4">
                      <input type="range" className="flex-1" min={100} max={2000} step={100} value={editingAgent.maxTokens} onChange={e => setEditingAgent({ ...editingAgent, maxTokens: Number(e.target.value) })} />
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300 w-24 text-right">~{Math.round(editingAgent.maxTokens * 0.75)} palabras</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Estilo de respuesta</label>
                    <p className="text-xs text-surface-400 mb-2">Que tan creativo o preciso quieres que sea tu agente</p>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-surface-400">Preciso</span>
                      <input type="range" className="flex-1" min={0} max={1} step={0.1} value={editingAgent.temperature} onChange={e => setEditingAgent({ ...editingAgent, temperature: Number(e.target.value) })} />
                      <span className="text-xs text-surface-400">Creativo</span>
                    </div>
                    <p className="text-center text-sm font-medium text-primary-600 dark:text-primary-400 mt-1">{getCreativityLabel(editingAgent.temperature)}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-5 border-t border-surface-200 dark:border-surface-700">
              <div className="flex gap-1">
                {activeSection !== 'basic' && (
                  <button type="button" onClick={() => setActiveSection(activeSection === 'advanced' ? 'behavior' : 'basic')} className="btn-ghost text-sm">Anterior</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingAgent(null)} className="btn-secondary">Cancelar</button>
                {activeSection !== 'advanced' ? (
                  <button type="button" onClick={() => setActiveSection(activeSection === 'basic' ? 'behavior' : 'advanced')} className="btn-primary flex items-center gap-1">Siguiente <ChevronRight size={14} /></button>
                ) : (
                  <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={16} /> Guardar agente</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Chat Modal */}
      {testingAgent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-lg h-[600px] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center"><Bot size={18} /></div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">{testingAgent.name}</h3>
                  <p className="text-xs text-surface-400">Conversacion de prueba</p>
                </div>
              </div>
              <button onClick={() => setTestingAgent(null)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {testMessages.length === 0 && (
                <div className="text-center py-12">
                  <Bot size={40} className="mx-auto mb-3 text-surface-300 dark:text-surface-600" />
                  <p className="text-sm text-surface-500">Escribe un mensaje para probar tu agente</p>
                  <p className="text-xs text-surface-400 mt-1">La conversacion usara tu API Key configurada</p>
                </div>
              )}
              {testMessages.map((msg, i) => (
                <div key={i} className={classNames('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={classNames(
                    'max-w-[80%] px-3 py-2 rounded-xl text-sm',
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-bl-sm'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-100 dark:bg-surface-700 px-4 py-2 rounded-xl rounded-bl-sm">
                    <Loader2 size={16} className="animate-spin text-surface-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Escribe un mensaje de prueba..."
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }}
                  disabled={testLoading}
                />
                <button onClick={sendTestMessage} disabled={testLoading || !testInput.trim()} className="btn-primary p-2.5">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
