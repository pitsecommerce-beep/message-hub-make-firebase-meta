import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Power, PowerOff, Edit3, Trash2, MessageSquare, Save, X, Send, Loader2, ChevronRight, Sparkles, Database, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAIAgents, createAIAgent, updateAIAgent, deleteAIAgent, getKnowledgeBases } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIAgent, AIProviderType, KnowledgeBase } from '@/types';

type TestMessage = { role: 'user' | 'assistant'; content: string };

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'o3-mini', label: 'O3 Mini' },
    { value: 'o1', label: 'O1' },
    { value: 'o1-mini', label: 'O1 Mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  custom: 'Personalizado',
};

export default function AIAgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testingAgent, setTestingAgent] = useState<AIAgent | null>(null);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'knowledge' | 'advanced'>('basic');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!user?.teamId) return;
    const [a, kb] = await Promise.all([
      getAIAgents(user.teamId).catch(() => []),
      getKnowledgeBases(user.teamId).catch(() => []),
    ]);
    setAgents(a);
    setKnowledgeBases(kb);
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
      id: '', teamId: user?.teamId || '', name: '', providerId: '',
      provider: 'openai', model: '', apiKey: '', baseUrl: '',
      systemPrompt: '',
      isActive: false, scope: 'all', selectedConversationIds: [], knowledgeBaseIds: [],
      attendOutsideBusinessHours: false,
      maxTokens: 500, temperature: 0.7, createdAt: '', updatedAt: '',
    });
    setIsNew(true);
    setActiveSection('basic');
  };

  const handleSave = async () => {
    if (!editingAgent || !user?.teamId) return;
    const now = new Date().toISOString();
    try {
      if (isNew) {
        await createAIAgent(user.teamId, { ...editingAgent, teamId: user.teamId, createdAt: now, updatedAt: now });
      } else {
        const { id: _id, ...dataWithoutId } = editingAgent;
        await updateAIAgent(user.teamId, editingAgent.id, { ...dataWithoutId, updatedAt: now });
      }
      setEditingAgent(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar el agente. Verifica los datos e intenta de nuevo.');
    }
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
    if (!testInput.trim() || !testingAgent) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTestLoading(true);

    if (!testingAgent.apiKey) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: 'Este agente no tiene una API Key configurada. Edita el agente para agregar tu API Key.' }]);
      setTestLoading(false);
      return;
    }

    try {
      let apiUrl = '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: Record<string, unknown> = {};

      if (testingAgent.provider === 'openai' || testingAgent.provider === 'custom') {
        apiUrl = testingAgent.baseUrl ? `${testingAgent.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${testingAgent.apiKey}`;
        body = {
          model: testingAgent.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: testingAgent.systemPrompt || 'Eres un asistente útil.' },
            ...testMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg },
          ],
          max_tokens: testingAgent.maxTokens,
          temperature: testingAgent.temperature,
        };
      } else if (testingAgent.provider === 'anthropic') {
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = testingAgent.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        body = {
          model: testingAgent.model || 'claude-sonnet-4-20250514',
          system: testingAgent.systemPrompt || 'Eres un asistente útil.',
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
      if (testingAgent.provider === 'anthropic') {
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

  const getCreativityLabel = (temp: number) => {
    if (temp <= 0.15) return 'Muy preciso';
    if (temp <= 0.4) return 'Preciso';
    if (temp <= 0.6) return 'Balanceado';
    if (temp <= 0.85) return 'Creativo';
    return 'Muy creativo';
  };

  const getModelLabel = (agent: AIAgent) => {
    const models = MODEL_OPTIONS[agent.provider];
    if (models) {
      const found = models.find(m => m.value === agent.model);
      if (found) return found.label;
    }
    return agent.model || agent.provider;
  };

  const toggleKnowledgeBase = (kbId: string) => {
    if (!editingAgent) return;
    const ids = editingAgent.knowledgeBaseIds || [];
    if (ids.includes(kbId)) {
      setEditingAgent({ ...editingAgent, knowledgeBaseIds: ids.filter(id => id !== kbId) });
    } else {
      setEditingAgent({ ...editingAgent, knowledgeBaseIds: [...ids, kbId] });
    }
  };

  const getAgentKBNames = (agent: AIAgent) => {
    const ids = agent.knowledgeBaseIds || [];
    if (ids.length === 0) return 'Sin bases de datos';
    return ids.map(id => knowledgeBases.find(kb => kb.id === id)?.name || '').filter(Boolean).join(', ') || 'Sin bases de datos';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Agente de IA" subtitle="Configura tu asistente inteligente para responder conversaciones"
        actions={<button onClick={handleNew} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Nuevo agente</button>} />

      {agents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-violet-500" />
          </div>
          <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200 mb-2">Crea tu primer agente de IA</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto mb-4">Un agente de IA puede responder automáticamente a tus clientes por WhatsApp, Messenger o Instagram.</p>
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
                    <p className="text-xs text-surface-400">{PROVIDER_LABELS[agent.provider] || agent.provider} - {getModelLabel(agent)}</p>
                  </div>
                </div>
                <button onClick={() => toggleActive(agent)} className={classNames('p-2 rounded-lg transition-colors', agent.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-100 dark:bg-surface-700 text-surface-400')}>
                  {agent.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mb-2 line-clamp-2">{agent.systemPrompt || 'Sin instrucciones configuradas'}</p>
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-2">
                <span className="flex items-center gap-1"><Database size={12} /> {getAgentKBNames(agent)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-4">
                <span className="flex items-center gap-1"><Clock size={12} />{agent.attendOutsideBusinessHours ? 'Atiende fuera de horario' : 'Solo horario comercial'}</span>
                <span className={classNames('px-2 py-0.5 rounded-full', agent.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-100 dark:bg-surface-700')}>{agent.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingAgent({ ...agent, knowledgeBaseIds: agent.knowledgeBaseIds || [], provider: agent.provider || 'openai', model: agent.model || '', apiKey: agent.apiKey || '', baseUrl: agent.baseUrl || '' }); setIsNew(false); setActiveSection('basic'); }} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><Edit3 size={12} /> Editar</button>
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
                { id: 'basic' as const, label: 'Información básica' },
                { id: 'knowledge' as const, label: 'Bases de datos' },
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

                  {/* Provider selection */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Proveedor de IA</label>
                    <select
                      className="input-field"
                      value={editingAgent.provider}
                      onChange={e => setEditingAgent({ ...editingAgent, provider: e.target.value as AIProviderType, model: '' })}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  {/* Model selection */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Modelo</label>
                    {editingAgent.provider === 'custom' ? (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="nombre-del-modelo"
                        value={editingAgent.model}
                        onChange={e => setEditingAgent({ ...editingAgent, model: e.target.value })}
                      />
                    ) : (
                      <select
                        className="input-field"
                        value={editingAgent.model}
                        onChange={e => setEditingAgent({ ...editingAgent, model: e.target.value })}
                      >
                        <option value="">Seleccionar modelo...</option>
                        {(MODEL_OPTIONS[editingAgent.provider] || []).map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">API Key</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="sk-..."
                      value={editingAgent.apiKey}
                      onChange={e => setEditingAgent({ ...editingAgent, apiKey: e.target.value })}
                    />
                    <p className="text-xs text-surface-400 mt-1">Tu clave de API del proveedor seleccionado</p>
                  </div>

                  {/* Base URL for custom provider */}
                  {editingAgent.provider === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Base URL</label>
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://api.custom.com/v1"
                        value={editingAgent.baseUrl || ''}
                        onChange={e => setEditingAgent({ ...editingAgent, baseUrl: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Instrucciones del agente</label>
                    <p className="text-xs text-surface-400 mb-2">Describe cómo quieres que se comporte tu agente. ¿Qué personalidad tiene? ¿Qué información debe dar? ¿Qué no debe hacer?</p>
                    <textarea className="input-field min-h-[150px] resize-y" placeholder="Ej: Eres un asistente amable de ventas para [tu empresa]. Ayudas a los clientes con información de productos, precios y disponibilidad. Siempre saludas cordialmente y ofreces ayuda adicional..." value={editingAgent.systemPrompt} onChange={e => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })} />
                  </div>

                  {/* Attend outside business hours */}
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-surface-300 transition-colors">
                    <input type="checkbox" className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-500" checked={editingAgent.attendOutsideBusinessHours} onChange={e => setEditingAgent({ ...editingAgent, attendOutsideBusinessHours: e.target.checked })} />
                    <div>
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Atender fuera de horario laboral</span>
                      <p className="text-xs text-surface-400">Si está activo, el agente responderá incluso fuera de tu horario comercial configurado en Configuración {'>'} Horario</p>
                    </div>
                  </label>
                </>
              )}

              {activeSection === 'knowledge' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Bases de datos disponibles para consultar</label>
                    <p className="text-xs text-surface-400 mb-4">Selecciona las bases de datos que este agente puede usar para responder preguntas. Sube bases en la sección Bases de Datos.</p>

                    {knowledgeBases.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                        <Database size={32} className="mx-auto mb-2 text-surface-300 dark:text-surface-600" />
                        <p className="text-sm text-surface-500 mb-1">No hay bases de datos cargadas</p>
                        <p className="text-xs text-surface-400">Ve a Bases de Datos para cargar tu primera base.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {knowledgeBases.map(kb => {
                          const isSelected = (editingAgent.knowledgeBaseIds || []).includes(kb.id);
                          return (
                            <button
                              key={kb.id}
                              type="button"
                              onClick={() => toggleKnowledgeBase(kb.id)}
                              className={classNames(
                                'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200',
                                isSelected
                                  ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                              )}
                            >
                              <div className={classNames(
                                'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                                isSelected ? 'border-primary-500 bg-primary-500' : 'border-surface-300 dark:border-surface-600'
                              )}>
                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{kb.name}</p>
                                <p className="text-xs text-surface-400">{kb.recordCount} registros - {kb.fileName}</p>
                              </div>
                              <Database size={16} className={isSelected ? 'text-primary-500' : 'text-surface-400'} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeSection === 'advanced' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Largo máximo de respuesta</label>
                    <p className="text-xs text-surface-400 mb-2">Cuántas palabras aproximadas puede usar el agente para responder</p>
                    <div className="flex items-center gap-4">
                      <input type="range" className="flex-1" min={100} max={2000} step={100} value={editingAgent.maxTokens} onChange={e => setEditingAgent({ ...editingAgent, maxTokens: Number(e.target.value) })} />
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300 w-24 text-right">~{Math.round(editingAgent.maxTokens * 0.75)} palabras</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Estilo de respuesta</label>
                    <p className="text-xs text-surface-400 mb-2">Qué tan creativo o preciso quieres que sea tu agente</p>
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
                  <button type="button" onClick={() => setActiveSection(activeSection === 'advanced' ? 'knowledge' : 'basic')} className="btn-ghost text-sm">Anterior</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingAgent(null)} className="btn-secondary">Cancelar</button>
                {activeSection !== 'advanced' ? (
                  <button type="button" onClick={() => setActiveSection(activeSection === 'basic' ? 'knowledge' : 'advanced')} className="btn-primary flex items-center gap-1">Siguiente <ChevronRight size={14} /></button>
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
                  <p className="text-xs text-surface-400">Conversación de prueba</p>
                </div>
              </div>
              <button onClick={() => setTestingAgent(null)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {testMessages.length === 0 && (
                <div className="text-center py-12">
                  <Bot size={40} className="mx-auto mb-3 text-surface-300 dark:text-surface-600" />
                  <p className="text-sm text-surface-500">Escribe un mensaje para probar tu agente</p>
                  <p className="text-xs text-surface-400 mt-1">La conversación usará la API Key del agente</p>
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
