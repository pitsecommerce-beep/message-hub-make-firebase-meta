import { useState, useEffect } from 'react';
import { Clock, Palette, Save, Webhook, MessageSquare, Bot, Plus, Trash2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTeam, updateTeam } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIProviderConfig, Team } from '@/types';

type SettingsTab = 'general' | 'meta' | 'ai-providers' | 'hours' | 'webhooks';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Palette size={16} /> },
  { id: 'meta', label: 'Meta API', icon: <MessageSquare size={16} /> },
  { id: 'ai-providers', label: 'Proveedores IA', icon: <Bot size={16} /> },
  { id: 'hours', label: 'Horario', icon: <Clock size={16} /> },
  { id: 'webhooks', label: 'Webhooks / Make', icon: <Webhook size={16} /> },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [team, setTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1a85e6');
  const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [makeWebhookInbound, setMakeWebhookInbound] = useState('');
  const [makeWebhookOutbound, setMakeWebhookOutbound] = useState('');
  const [makeScenarioUrl, setMakeScenarioUrl] = useState('');
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const [schedule, setSchedule] = useState(days.map((d, i) => ({ day: d, enabled: i < 6, start: '09:00', end: '18:00' })));
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.teamId) return;
    getTeam(user.teamId).then(t => {
      if (t) {
        setTeam(t);
        setTeamName(t.name || '');
        setPrimaryColor(t.settings?.primaryColor || '#1a85e6');
        setProviders(t.settings?.aiProviders || []);
        setTimezone(t.settings?.businessHours?.timezone || 'America/Mexico_City');
        const mc = t.settings?.metaConfig || {};
        setWhatsappBusinessId(mc.whatsappBusinessId || '');
        setPhoneNumberId(mc.phoneNumberId || '');
        setAccessToken(mc.accessToken || '');
        setWebhookVerifyToken(mc.webhookVerifyToken || '');
        setMakeWebhookInbound(mc.makeWebhookInbound || '');
        setMakeWebhookOutbound(mc.makeWebhookOutbound || '');
        setMakeScenarioUrl(mc.makeScenarioUrl || '');
        if (t.settings?.businessHours?.schedule) {
          const s = t.settings.businessHours.schedule as unknown as Record<string, { enabled: boolean; start: string; end: string }>;
          const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
          setSchedule(days.map((d, i) => ({
            day: d,
            enabled: s[dayKeys[i]]?.enabled ?? i < 6,
            start: s[dayKeys[i]]?.start || '09:00',
            end: s[dayKeys[i]]?.end || '18:00',
          })));
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.teamId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!user?.teamId) return;
    setSaving(true);
    const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    await updateTeam(user.teamId, {
      name: teamName,
      settings: {
        primaryColor,
        aiProviders: providers,
        businessHours: {
          timezone,
          schedule: Object.fromEntries(dayKeys.map((k, i) => [k, { enabled: schedule[i].enabled, start: schedule[i].start, end: schedule[i].end }])),
        },
        metaConfig: { whatsappBusinessId, phoneNumberId, accessToken, webhookVerifyToken, makeWebhookInbound, makeWebhookOutbound, makeScenarioUrl },
        channelConnections: team?.settings?.channelConnections || [],
      },
    } as unknown as Partial<Team>);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addProvider = () => setProviders(prev => [...prev, { id: `p-${Date.now()}`, name: '', provider: 'openai', apiKey: '', model: '', baseUrl: '' }]);
  const removeProvider = (id: string) => setProviders(prev => prev.filter(p => p.id !== id));
  const updateProvider = (id: string, field: keyof AIProviderConfig, value: string) => setProviders(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Configuración" subtitle="Configura tu equipo, integraciones y proveedores"
        actions={<button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">{saved ? <Check size={16} /> : <Save size={16} />}{saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}</button>} />

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">{tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={classNames('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left', activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-50')}>{tab.icon}{tab.label}</button>
          ))}</nav>
        </div>

        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">General</h3>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Nombre del equipo</label><input type="text" className="input-field max-w-md" value={teamName} onChange={e => setTeamName(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Color principal</label><div className="flex items-center gap-3"><input type="color" className="w-10 h-10 rounded-lg border cursor-pointer" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} /><input type="text" className="input-field max-w-[140px]" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} /></div></div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Configuración de Meta API</h3>
              <p className="text-sm text-surface-500">Conecta la API de Meta para WhatsApp, Messenger e Instagram.</p>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">WhatsApp Business ID</label><input type="text" className="input-field max-w-md" placeholder="123456789012345" value={whatsappBusinessId} onChange={e => setWhatsappBusinessId(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Phone Number ID</label><input type="text" className="input-field max-w-md" placeholder="109876543210" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Access Token (Meta)</label><input type="password" className="input-field max-w-md" placeholder="EAAxxxxxxxx..." value={accessToken} onChange={e => setAccessToken(e.target.value)} /><p className="text-xs text-surface-400 mt-1">Token permanente de tu app de Meta para enviar mensajes.</p></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Webhook Verify Token</label><div className="flex items-center gap-2 max-w-md"><input type="text" className="input-field" value={webhookVerifyToken} onChange={e => setWebhookVerifyToken(e.target.value)} /><button onClick={() => handleCopy(webhookVerifyToken, 'verify')} className="btn-secondary p-2">{copied === 'verify' ? <Check size={16} /> : <Copy size={16} />}</button></div><p className="text-xs text-surface-400 mt-1">Usa este token al configurar el webhook en Meta / Make.</p></div>
            </div>
          )}

          {activeTab === 'ai-providers' && (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4"><h3 className="text-base font-semibold text-surface-800">Proveedores de IA</h3><button onClick={addProvider} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> Agregar</button></div>
                <div className="space-y-4">{providers.map(provider => (
                  <div key={provider.id} className="p-4 rounded-xl border border-surface-200 space-y-3">
                    <div className="flex items-center justify-between"><input type="text" className="input-field max-w-xs" placeholder="Nombre" value={provider.name} onChange={e => updateProvider(provider.id, 'name', e.target.value)} /><button onClick={() => removeProvider(provider.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500"><Trash2 size={14} /></button></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs text-surface-500 mb-1">Proveedor</label><select className="input-field" value={provider.provider} onChange={e => updateProvider(provider.id, 'provider', e.target.value)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="custom">Personalizado</option></select></div><div><label className="block text-xs text-surface-500 mb-1">Modelo</label><input type="text" className="input-field" placeholder="gpt-4o" value={provider.model} onChange={e => updateProvider(provider.id, 'model', e.target.value)} /></div></div>
                    <div><label className="block text-xs text-surface-500 mb-1">API Key</label><input type="password" className="input-field" placeholder="sk-..." value={provider.apiKey} onChange={e => updateProvider(provider.id, 'apiKey', e.target.value)} /></div>
                    {provider.provider === 'custom' && <div><label className="block text-xs text-surface-500 mb-1">Base URL</label><input type="url" className="input-field" placeholder="https://api.custom.com/v1" value={provider.baseUrl} onChange={e => updateProvider(provider.id, 'baseUrl', e.target.value)} /></div>}
                  </div>
                ))}</div>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Horario comercial</h3>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Zona horaria</label><select className="input-field max-w-xs" value={timezone} onChange={e => setTimezone(e.target.value)}><option value="America/Mexico_City">Ciudad de México (CST)</option><option value="America/Monterrey">Monterrey (CST)</option><option value="America/Tijuana">Tijuana (PST)</option><option value="America/Cancun">Cancún (EST)</option><option value="America/Bogota">Bogotá (COT)</option></select></div>
              <div className="space-y-2">{schedule.map((day, i) => (
                <div key={day.day} className="flex items-center gap-4 p-3 rounded-lg bg-surface-50">
                  <label className="flex items-center gap-2 w-28"><input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-primary-500" checked={day.enabled} onChange={() => { const s = [...schedule]; s[i] = { ...day, enabled: !day.enabled }; setSchedule(s); }} /><span className="text-sm font-medium text-surface-700">{day.day}</span></label>
                  {day.enabled ? (<div className="flex items-center gap-2"><input type="time" className="input-field w-auto py-1" value={day.start} onChange={e => { const s = [...schedule]; s[i] = { ...day, start: e.target.value }; setSchedule(s); }} /><span className="text-surface-400">a</span><input type="time" className="input-field w-auto py-1" value={day.end} onChange={e => { const s = [...schedule]; s[i] = { ...day, end: e.target.value }; setSchedule(s); }} /></div>) : (<span className="text-sm text-surface-400">Cerrado</span>)}
                </div>
              ))}</div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Configuración de Make</h3>
              <p className="text-sm text-surface-500">Configura los webhooks de Make para conectar la API de Meta con Firebase.</p>

              <div><label className="block text-sm font-medium text-surface-700 mb-1">Webhook de Make (Mensajes entrantes)</label><input type="url" className="input-field max-w-lg" placeholder="https://hook.us1.make.com/xxxxx" value={makeWebhookInbound} onChange={e => setMakeWebhookInbound(e.target.value)} /><p className="text-xs text-surface-400 mt-1">URL del webhook de Make que recibe mensajes de Meta y los envía a Firebase.</p></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">Webhook de Make (Mensajes salientes)</label><input type="url" className="input-field max-w-lg" placeholder="https://hook.us1.make.com/yyyyy" value={makeWebhookOutbound} onChange={e => setMakeWebhookOutbound(e.target.value)} /><p className="text-xs text-surface-400 mt-1">URL del webhook que Make usa para enviar mensajes por la API de Meta.</p></div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1">URL del escenario de Make</label><input type="url" className="input-field max-w-lg" placeholder="https://us1.make.com/scenarios/xxxxx" value={makeScenarioUrl} onChange={e => setMakeScenarioUrl(e.target.value)} /><p className="text-xs text-surface-400 mt-1">Enlace a tu escenario de Make para referencia rápida.</p></div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Instrucciones de configuración en Make</h4>
                <ol className="text-xs text-blue-700 space-y-2 list-decimal list-inside">
                  <li>Crea un nuevo escenario en Make con un módulo <strong>Webhook</strong> como trigger.</li>
                  <li>Copia la URL del webhook y pégala arriba en "Mensajes entrantes".</li>
                  <li>Configura la API de Meta para enviar eventos al webhook de Make.</li>
                  <li>En Make, agrega un módulo de <strong>Firebase Firestore</strong> para escribir los mensajes.</li>
                  <li>Para mensajes salientes, crea otro escenario con webhook trigger.</li>
                  <li>Agrega un módulo <strong>HTTP</strong> que llame a la API de Meta para enviar el mensaje.</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
                <h4 className="text-sm font-medium text-surface-800 mb-2">JSON que Make debe enviar a Firebase</h4>
                <p className="text-xs text-surface-500 mb-2">Cuando Make recibe un mensaje de Meta, debe escribir este JSON en <code className="bg-surface-100 px-1 rounded">teams/TEAM_ID/messages</code>:</p>
                <pre className="text-xs bg-surface-100 p-3 rounded-lg overflow-x-auto font-mono text-surface-700">{`{
  "conversationId": "conv_xxx",
  "contactId": "contact_xxx",
  "teamId": "${user?.teamId || 'TEAM_ID'}",
  "direction": "inbound",
  "platform": "whatsapp | messenger | instagram",
  "content": "Texto del mensaje",
  "messageType": "text",
  "status": "delivered",
  "isAiGenerated": false,
  "createdAt": "2026-03-06T12:00:00Z",
  "metadata": {
    "metaMessageId": "wamid.xxx",
    "from": "+521234567890"
  }
}`}</pre>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
                <h4 className="text-sm font-medium text-surface-800 mb-2">JSON para enviar mensajes (Make → Meta API)</h4>
                <p className="text-xs text-surface-500 mb-2">Cuando se envía un mensaje desde el chat, Make debe llamar a la API de Meta con:</p>
                <pre className="text-xs bg-surface-100 p-3 rounded-lg overflow-x-auto font-mono text-surface-700">{`POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "+521234567890",
  "type": "text",
  "text": { "body": "Hola, ¿en qué te puedo ayudar?" }
}`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
