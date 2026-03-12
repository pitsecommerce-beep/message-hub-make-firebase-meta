import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Power, PowerOff, Edit3, Trash2, MessageSquare, Save, X, Send, Loader2, ChevronRight, Sparkles, Database, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAIAgents, createAIAgent, updateAIAgent, deleteAIAgent, getKnowledgeBases, queryKnowledgeBaseRecords } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIAgent, AIProviderType, KnowledgeBase, MessagePlatform } from '@/types';
import PlatformIcon from '@/components/shared/PlatformIcon';

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
      connectedChannels: [],
    });
    setIsNew(true);
    setActiveSection('basic');
  };

  const togglePlatform = (platform: MessagePlatform) => {
    if (!editingAgent) return;
    const channels = editingAgent.connectedChannels || [];
    if (channels.includes(platform)) {
      setEditingAgent({ ...editingAgent, connectedChannels: channels.filter(p => p !== platform) });
    } else {
      setEditingAgent({ ...editingAgent, connectedChannels: [...channels, platform] });
    }
  };

  const generateAgentDocId = (platforms: MessagePlatform[]): string => {
    const order: MessagePlatform[] = ['whatsapp', 'instagram', 'messenger'];
    return platforms.sort((a, b) => order.indexOf(a) - order.indexOf(b)).join('-');
  };

  const PLATFORM_OPTIONS: { value: MessagePlatform; label: string }[] = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'messenger', label: 'Messenger' },
  ];

  const handleSave = async () => {
    if (!editingAgent || !user?.teamId) return;
    const platforms = editingAgent.connectedChannels || [];
    if (platforms.length === 0) {
      alert('Selecciona al menos una plataforma para el agente.');
      setActiveSection('basic');
      return;
    }
    const now = new Date().toISOString();
    try {
      if (isNew) {
        const docId = generateAgentDocId([...platforms]);
        await createAIAgent(user.teamId, { ...editingAgent, teamId: user.teamId, createdAt: now, updatedAt: now }, docId);
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

  const getAgentKnowledgeBases = (agent: AIAgent) => {
    const ids = agent.knowledgeBaseIds || [];
    return knowledgeBases.filter(kb => ids.includes(kb.id));
  };

  const buildQueryDatabaseTool = (kbs: KnowledgeBase[]) => {
    const allHeaders = [...new Set(kbs.flatMap(kb => kb.headers))];
    const properties: Record<string, { type: string; description: string }> = {};
    allHeaders.forEach(h => {
      properties[h] = { type: 'string', description: `Filtrar por ${h}` };
    });
    return {
      name: 'query_database',
      description: 'Busca productos o registros en la base de datos de inventario. Usa los filtros disponibles para encontrar piezas específicas. Los valores se comparan en mayúsculas.',
      parameters: {
        type: 'object' as const,
        properties,
        required: [] as string[],
      },
    };
  };

  const executeQueryDatabase = async (args: Record<string, string>, kbs: KnowledgeBase[]) => {
    if (!user?.teamId) return [];
    const results: Record<string, unknown>[] = [];
    for (const kb of kbs) {
      const relevantFilters: Record<string, string> = {};
      for (const [key, val] of Object.entries(args)) {
        if (val && kb.headers.includes(key)) {
          relevantFilters[key] = val;
        }
      }
      if (Object.keys(relevantFilters).length > 0 || Object.keys(args).length === 0) {
        const records = await queryKnowledgeBaseRecords(user.teamId, kb.collectionName, relevantFilters, 10);
        results.push(...records);
      }
    }
    return results;
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

    const agentKBs = getAgentKnowledgeBases(testingAgent);
    const hasKBs = agentKBs.length > 0;

    try {
      if (testingAgent.provider === 'openai' || testingAgent.provider === 'custom') {
        await sendTestOpenAI(testingAgent, userMsg, agentKBs, hasKBs);
      } else if (testingAgent.provider === 'anthropic') {
        await sendTestAnthropic(testingAgent, userMsg, agentKBs, hasKBs);
      }
    } catch (err) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'No se pudo conectar con el proveedor de IA'}` }]);
    }
    setTestLoading(false);
  };

  const sendTestOpenAI = async (agent: AIAgent, userMsg: string, kbs: KnowledgeBase[], hasKBs: boolean) => {
    const apiUrl = agent.baseUrl ? `${agent.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agent.apiKey}` };
    const tool = hasKBs ? buildQueryDatabaseTool(kbs) : null;

    const messages: Record<string, unknown>[] = [
      { role: 'system', content: agent.systemPrompt || 'Eres un asistente útil.' },
      ...testMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const body: Record<string, unknown> = {
        model: agent.model || 'gpt-4o-mini',
        messages,
        max_tokens: agent.maxTokens,
        temperature: agent.temperature,
      };
      if (tool) {
        body.tools = [{ type: 'function', function: tool }];
      }

      const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await resp.json();
      const choice = data.choices?.[0];

      if (!choice) {
        setTestMessages(prev => [...prev, { role: 'assistant', content: data.error?.message || 'Sin respuesta' }]);
        return;
      }

      if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
        messages.push(choice.message);
        for (const tc of choice.message.tool_calls) {
          if (tc.function?.name === 'query_database') {
            const args = JSON.parse(tc.function.arguments || '{}');
            const results = await executeQueryDatabase(args, kbs);
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(results),
            });
          }
        }
        continue;
      }

      setTestMessages(prev => [...prev, { role: 'assistant', content: choice.message?.content || 'Sin respuesta' }]);
      return;
    }
    setTestMessages(prev => [...prev, { role: 'assistant', content: 'Se alcanzó el límite de consultas a la base de datos.' }]);
  };

  const sendTestAnthropic = async (agent: AIAgent, userMsg: string, kbs: KnowledgeBase[], hasKBs: boolean) => {
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': agent.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    const tool = hasKBs ? buildQueryDatabaseTool(kbs) : null;

    const messages: Record<string, unknown>[] = [
      ...testMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const body: Record<string, unknown> = {
        model: agent.model || 'claude-sonnet-4-20250514',
        system: agent.systemPrompt || 'Eres un asistente útil.',
        messages,
        max_tokens: agent.maxTokens,
      };
      if (tool) {
        body.tools = [{
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters,
        }];
      }

      const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await resp.json();

      if (data.error) {
        setTestMessages(prev => [...prev, { role: 'assistant', content: data.error.message || 'Error del proveedor' }]);
        return;
      }

      if (data.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: data.content });
        const toolResults: Record<string, unknown>[] = [];
        for (const block of data.content) {
          if (block.type === 'tool_use' && block.name === 'query_database') {
            const results = await executeQueryDatabase(block.input || {}, kbs);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(results),
            });
          }
        }
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
      setTestMessages(prev => [...prev, { role: 'assistant', content: textBlock?.text || 'Sin respuesta' }]);
      return;
    }
    setTestMessages(prev => [...prev, { role: 'assistant', content: 'Se alcanzó el límite de consultas a la base de datos.' }]);
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
              {(agent.connectedChannels || []).length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  {(agent.connectedChannels || []).map(ch => (
                    <span key={ch} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-xs text-surface-600 dark:text-surface-300">
                      <PlatformIcon platform={ch} size={12} />
                      {ch === 'whatsapp' ? 'WhatsApp' : ch === 'instagram' ? 'Instagram' : 'Messenger'}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-2">
                <span className="flex items-center gap-1"><Database size={12} /> {getAgentKBNames(agent)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-surface-400 mb-4">
                <span className="flex items-center gap-1"><Clock size={12} />{agent.attendOutsideBusinessHours ? 'Atiende fuera de horario' : 'Solo horario comercial'}</span>
                <span className={classNames('px-2 py-0.5 rounded-full', agent.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-surface-100 dark:bg-surface-700')}>{agent.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingAgent({ ...agent, knowledgeBaseIds: agent.knowledgeBaseIds || [], connectedChannels: agent.connectedChannels || [], provider: agent.provider || 'openai', model: agent.model || '', apiKey: agent.apiKey || '', baseUrl: agent.baseUrl || '' }); setIsNew(false); setActiveSection('basic'); }} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><Edit3 size={12} /> Editar</button>
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
                  {/* Platform selection */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Plataformas asignadas</label>
                    <p className="text-xs text-surface-400 mb-3">Selecciona en qué plataformas atenderá este agente. El identificador del agente se generará según las plataformas seleccionadas.</p>
                    <div className="grid grid-cols-3 gap-3">
                      {PLATFORM_OPTIONS.map(opt => {
                        const isSelected = (editingAgent.connectedChannels || []).includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => !(!isNew && agents.some(a => a.id === editingAgent.id)) ? togglePlatform(opt.value) : togglePlatform(opt.value)}
                            disabled={!isNew}
                            className={classNames(
                              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                              isSelected
                                ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
                              !isNew ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            )}
                          >
                            <PlatformIcon platform={opt.value} size={28} />
                            <span className={classNames(
                              'text-sm font-medium',
                              isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'
                            )}>{opt.label}</span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {isNew && (editingAgent.connectedChannels || []).length > 0 && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
                        <MessageCircle size={14} className="text-surface-400 flex-shrink-0" />
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          ID del documento: <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{generateAgentDocId([...(editingAgent.connectedChannels || [])])}</span>
                        </p>
                      </div>
                    )}
                    {!isNew && (
                      <p className="text-xs text-surface-400 mt-2">Las plataformas no se pueden cambiar después de crear el agente porque definen su identificador.</p>
                    )}
                  </div>

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
