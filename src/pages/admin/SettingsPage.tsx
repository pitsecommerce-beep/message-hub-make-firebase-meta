import { useState } from 'react';
import {
  Clock,
  Palette,
  Save,
  Webhook,
  MessageSquare,
  Bot,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { AIProviderConfig } from '@/types';

type SettingsTab = 'general' | 'meta' | 'ai-providers' | 'hours' | 'webhooks';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Palette size={16} /> },
  { id: 'meta', label: 'Meta / yCloud', icon: <MessageSquare size={16} /> },
  { id: 'ai-providers', label: 'Proveedores IA', icon: <Bot size={16} /> },
  { id: 'hours', label: 'Horario', icon: <Clock size={16} /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={16} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);

  // General
  const [teamName, setTeamName] = useState('Mi Empresa');
  const [primaryColor, setPrimaryColor] = useState('#1a85e6');

  // Meta
  const [yCloudApiKey, setYCloudApiKey] = useState('');
  const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('mh_verify_token_2026');

  // AI Providers
  const [providers, setProviders] = useState<AIProviderConfig[]>([
    { id: 'p1', name: 'OpenAI Principal', provider: 'openai', apiKey: '', model: 'gpt-4o', baseUrl: '' },
    { id: 'p2', name: 'Anthropic', provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4-6', baseUrl: '' },
  ]);

  // Hours
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const [schedule, setSchedule] = useState(
    days.map((d, i) => ({
      day: d,
      enabled: i < 6,
      start: '09:00',
      end: '18:00',
    }))
  );

  // Webhooks
  const makeWebhookUrl = 'https://hook.us1.make.com/YOUR_WEBHOOK_ID';
  const incomingWebhookUrl = `https://us-central1-YOUR_PROJECT.cloudfunctions.net/metaWebhook`;
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addProvider = () => {
    setProviders(prev => [...prev, {
      id: `p-${Date.now()}`,
      name: '',
      provider: 'openai',
      apiKey: '',
      model: '',
      baseUrl: '',
    }]);
  };

  const removeProvider = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
  };

  const updateProvider = (id: string, field: keyof AIProviderConfig, value: string) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Configuración"
        subtitle="Configura tu equipo, integraciones y proveedores"
        actions={
          <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-2">
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        }
      />

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                  activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Configuración general</h3>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Nombre del equipo</label>
                <input type="text" className="input-field max-w-md" value={teamName} onChange={e => setTeamName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Color principal</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="w-10 h-10 rounded-lg border cursor-pointer" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                  <input type="text" className="input-field max-w-[140px]" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Configuración de Meta / yCloud</h3>
              <p className="text-sm text-surface-500">
                Conecta tu cuenta de yCloud para recibir y enviar mensajes por WhatsApp, Messenger e Instagram.
              </p>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">yCloud API Key</label>
                <input type="password" className="input-field max-w-md" placeholder="ycl_xxxxxxxxxxxxxxxx" value={yCloudApiKey} onChange={e => setYCloudApiKey(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">WhatsApp Business ID</label>
                <input type="text" className="input-field max-w-md" placeholder="123456789012345" value={whatsappBusinessId} onChange={e => setWhatsappBusinessId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number ID</label>
                <input type="text" className="input-field max-w-md" placeholder="109876543210" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Webhook Verify Token</label>
                <div className="flex items-center gap-2 max-w-md">
                  <input type="text" className="input-field" value={webhookVerifyToken} onChange={e => setWebhookVerifyToken(e.target.value)} />
                  <button onClick={() => handleCopy(webhookVerifyToken, 'verify')} className="btn-secondary p-2">
                    {copied === 'verify' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-surface-400 mt-1">Usa este token al configurar el webhook en yCloud / Make.</p>
              </div>
            </div>
          )}

          {activeTab === 'ai-providers' && (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-surface-800">Proveedores de IA</h3>
                  <button onClick={addProvider} className="btn-secondary text-sm flex items-center gap-1">
                    <Plus size={14} /> Agregar
                  </button>
                </div>
                <p className="text-sm text-surface-500 mb-5">
                  Configura los proveedores de IA que tus agentes podrán usar para responder conversaciones.
                </p>

                <div className="space-y-4">
                  {providers.map(provider => (
                    <div key={provider.id} className="p-4 rounded-xl border border-surface-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          className="input-field max-w-xs"
                          placeholder="Nombre del proveedor"
                          value={provider.name}
                          onChange={e => updateProvider(provider.id, 'name', e.target.value)}
                        />
                        <button onClick={() => removeProvider(provider.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-surface-500 mb-1">Proveedor</label>
                          <select
                            className="input-field"
                            value={provider.provider}
                            onChange={e => updateProvider(provider.id, 'provider', e.target.value)}
                          >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="custom">Personalizado</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-surface-500 mb-1">Modelo</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="gpt-4o, claude-sonnet-4-6..."
                            value={provider.model}
                            onChange={e => updateProvider(provider.id, 'model', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-surface-500 mb-1">API Key</label>
                        <input
                          type="password"
                          className="input-field"
                          placeholder="sk-..."
                          value={provider.apiKey}
                          onChange={e => updateProvider(provider.id, 'apiKey', e.target.value)}
                        />
                      </div>
                      {provider.provider === 'custom' && (
                        <div>
                          <label className="block text-xs text-surface-500 mb-1">Base URL</label>
                          <input
                            type="url"
                            className="input-field"
                            placeholder="https://api.custom-provider.com/v1"
                            value={provider.baseUrl}
                            onChange={e => updateProvider(provider.id, 'baseUrl', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Horario comercial</h3>
              <p className="text-sm text-surface-500">
                Los agentes de IA que usan horario comercial solo responderán dentro de estos horarios.
              </p>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Zona horaria</label>
                <select className="input-field max-w-xs" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  <option value="America/Mexico_City">Ciudad de México (CST)</option>
                  <option value="America/Monterrey">Monterrey (CST)</option>
                  <option value="America/Tijuana">Tijuana (PST)</option>
                  <option value="America/Cancun">Cancún (EST)</option>
                  <option value="America/Bogota">Bogotá (COT)</option>
                  <option value="America/Lima">Lima (PET)</option>
                </select>
              </div>
              <div className="space-y-2">
                {schedule.map((day, i) => (
                  <div key={day.day} className="flex items-center gap-4 p-3 rounded-lg bg-surface-50">
                    <label className="flex items-center gap-2 w-28">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-surface-300 text-primary-500"
                        checked={day.enabled}
                        onChange={() => {
                          const newSchedule = [...schedule];
                          newSchedule[i] = { ...day, enabled: !day.enabled };
                          setSchedule(newSchedule);
                        }}
                      />
                      <span className="text-sm font-medium text-surface-700">{day.day}</span>
                    </label>
                    {day.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          className="input-field w-auto py-1"
                          value={day.start}
                          onChange={e => {
                            const newSchedule = [...schedule];
                            newSchedule[i] = { ...day, start: e.target.value };
                            setSchedule(newSchedule);
                          }}
                        />
                        <span className="text-surface-400">a</span>
                        <input
                          type="time"
                          className="input-field w-auto py-1"
                          value={day.end}
                          onChange={e => {
                            const newSchedule = [...schedule];
                            newSchedule[i] = { ...day, end: e.target.value };
                            setSchedule(newSchedule);
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-surface-400">Cerrado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-base font-semibold text-surface-800">Webhooks de Make</h3>
              <p className="text-sm text-surface-500">
                Configura estos URLs en Make para conectar la API de Meta (vía yCloud) con tu MessageHub.
              </p>

              <div className="p-4 rounded-xl border border-surface-200 space-y-2">
                <h4 className="text-sm font-medium text-surface-700">URL de Webhook (Make → Firebase)</h4>
                <p className="text-xs text-surface-400">Usa este URL como destino en tu módulo de Make que envía mensajes a Firebase.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-surface-50 p-2 rounded-lg font-mono text-surface-600 truncate">{incomingWebhookUrl}</code>
                  <button onClick={() => handleCopy(incomingWebhookUrl, 'incoming')} className="btn-secondary p-2 flex-shrink-0">
                    {copied === 'incoming' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-surface-200 space-y-2">
                <h4 className="text-sm font-medium text-surface-700">URL de Webhook de Make (Trigger)</h4>
                <p className="text-xs text-surface-400">Configura este URL en yCloud como Webhook URL para mensajes entrantes.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-surface-50 p-2 rounded-lg font-mono text-surface-600 truncate">{makeWebhookUrl}</code>
                  <button onClick={() => handleCopy(makeWebhookUrl, 'make')} className="btn-secondary p-2 flex-shrink-0">
                    {copied === 'make' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Instrucciones rápidas</h4>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Importa el blueprint de Make que se incluye con este proyecto.</li>
                  <li>Configura tus credenciales de yCloud y Firebase en cada módulo.</li>
                  <li>En yCloud, apunta el webhook de mensajes entrantes a la URL de Make.</li>
                  <li>Activa el escenario en Make.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
