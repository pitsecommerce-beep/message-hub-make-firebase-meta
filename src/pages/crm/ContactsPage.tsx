import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, Tag, MessageSquare, ShoppingCart, X, Building2, FileText, MapPin, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getContacts, getOrders, getConversations, createContact } from '@/services/firestore';
import { formatRelativeTime, getPlatformLabel, getInitials, classNames } from '@/utils/helpers';
import PlatformIcon from '@/components/shared/PlatformIcon';
import PageHeader from '@/components/shared/PageHeader';
import type { Contact, Order, Conversation, MessagePlatform } from '@/types';

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  const loadData = async () => {
    if (!user?.teamId) return;
    const [c, o, cv] = await Promise.all([
      getContacts(user.teamId).catch(() => []),
      getOrders(user.teamId).catch(() => []),
      getConversations(user.teamId).catch(() => []),
    ]);
    setContacts(c); setOrders(o); setConvos(cv); setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.teamId]);

  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];
  const filtered = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search) && !c.company?.toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
    return true;
  });

  const contactOrders = selectedContact ? orders.filter(o => o.contactId === selectedContact.id) : [];
  const contactConvos = selectedContact ? convos.filter(c => c.contactId === selectedContact.id) : [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-6 pb-0">
          <PageHeader title="Contactos" subtitle={`${contacts.length} contactos en total`}
            actions={<button onClick={() => setShowNewForm(true)} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Nuevo contacto</button>} />
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="text" placeholder="Buscar por nombre, telefono o empresa..." className="input-field pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {allTags.length > 0 && (
              <select className="input-field w-auto" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
                <option value="">Todas las etiquetas</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {contacts.length === 0 ? (
            <div className="card p-8 text-center">
              <MessageSquare size={40} className="mx-auto mb-3 text-surface-300" />
              <p className="text-sm text-surface-400 dark:text-surface-500">Sin contactos aun. Crea tu primer contacto o carga un Excel desde Bases de Datos.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Contacto</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Empresa</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Plataforma</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Telefono</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Etiquetas</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Ultimo mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(contact => (
                    <tr key={contact.id} className={classNames('border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700/50 cursor-pointer transition-colors', selectedContact?.id === contact.id ? 'bg-primary-50/50 dark:bg-primary-900/20' : '')} onClick={() => setSelectedContact(contact)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xs font-semibold">{getInitials(contact.name)}</div>
                          <div>
                            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{contact.name}</p>
                            {contact.email && <p className="text-xs text-surface-400">{contact.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{contact.company || '-'}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><PlatformIcon platform={contact.platform} size={14} /><span className="text-sm text-surface-600 dark:text-surface-400">{getPlatformLabel(contact.platform)}</span></div></td>
                      <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{contact.phone || '-'}</td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(contact.tags || []).map(tag => <span key={tag} className="badge-neutral">{tag}</span>)}</div></td>
                      <td className="px-4 py-3 text-xs text-surface-400">{contact.lastMessageAt ? formatRelativeTime(contact.lastMessageAt) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedContact && (
        <div className="w-80 border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-800 dark:text-surface-200">Detalle</h3>
              <button onClick={() => setSelectedContact(null)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={16} /></button>
            </div>
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xl font-semibold mx-auto mb-2">{getInitials(selectedContact.name)}</div>
              <p className="font-semibold text-surface-900 dark:text-surface-100">{selectedContact.name}</p>
              <div className="flex items-center justify-center gap-1 mt-1"><PlatformIcon platform={selectedContact.platform} size={14} /><span className="text-xs text-surface-500">{getPlatformLabel(selectedContact.platform)}</span></div>
            </div>
            <div className="space-y-3 text-sm mb-5">
              {selectedContact.phone && <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300"><Phone size={14} className="text-surface-400" /><span>{selectedContact.phone}</span></div>}
              {selectedContact.email && <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300"><Mail size={14} className="text-surface-400" /><span>{selectedContact.email}</span></div>}
              {selectedContact.company && <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300"><Building2 size={14} className="text-surface-400" /><span>{selectedContact.company}</span></div>}
              {selectedContact.rfc && <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300"><FileText size={14} className="text-surface-400" /><span>RFC: {selectedContact.rfc}</span></div>}
              {selectedContact.address && <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300"><MapPin size={14} className="text-surface-400" /><span>{selectedContact.address}</span></div>}
              {(selectedContact.tags || []).length > 0 && <div className="flex items-start gap-2"><Tag size={14} className="text-surface-400 mt-0.5" /><div className="flex flex-wrap gap-1">{selectedContact.tags.map(t => <span key={t} className="badge-neutral">{t}</span>)}</div></div>}
            </div>
            {selectedContact.notes && <div className="mb-5 p-3 rounded-lg bg-surface-50 dark:bg-surface-700 text-sm text-surface-600 dark:text-surface-300"><p className="text-xs font-medium text-surface-400 mb-1">Notas</p>{selectedContact.notes}</div>}
            <div className="mb-5">
              <h4 className="text-xs font-medium text-surface-400 mb-2 flex items-center gap-1"><MessageSquare size={12} /> Conversaciones ({contactConvos.length})</h4>
              {contactConvos.map(c => (
                <div key={c.id} className="p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 cursor-pointer mb-1">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><PlatformIcon platform={c.platform} size={12} /><span className="text-xs font-medium text-surface-700 dark:text-surface-300 capitalize">{c.status}</span></div><span className="text-xs text-surface-400">{formatRelativeTime(c.updatedAt)}</span></div>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-medium text-surface-400 mb-2 flex items-center gap-1"><ShoppingCart size={12} /> Pedidos ({contactOrders.length})</h4>
              {contactOrders.map(o => (
                <div key={o.id} className="p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 cursor-pointer mb-1">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-surface-700 dark:text-surface-300">{o.orderNumber}</span><span className="text-xs text-surface-500 capitalize">{o.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNewForm && (
        <NewContactModal
          teamId={user?.teamId || ''}
          onClose={() => setShowNewForm(false)}
          onSaved={() => { setShowNewForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function NewContactModal({ teamId, onClose, onSaved }: { teamId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [rfc, setRfc] = useState('');
  const [address, setAddress] = useState('');
  const [platform, setPlatform] = useState<MessagePlatform>('whatsapp');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      await createContact(teamId, {
        teamId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        rfc: rfc.trim() || undefined,
        address: address.trim() || undefined,
        platform,
        platformId: phone.trim() || email.trim() || `manual-${Date.now()}`,
        tags: [],
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      } as Omit<Contact, 'id'>);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Nuevo contacto</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Nombre del contacto *</label>
            <input type="text" className="input-field" placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Telefono</label>
              <input type="tel" className="input-field" placeholder="+52 55 1234 5678" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
              <input type="email" className="input-field" placeholder="correo@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Empresa</label>
            <input type="text" className="input-field" placeholder="Nombre de la empresa" value={company} onChange={e => setCompany(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">RFC</label>
              <input type="text" className="input-field" placeholder="XAXX010101000" value={rfc} onChange={e => setRfc(e.target.value.toUpperCase())} maxLength={13} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Plataforma</label>
              <select className="input-field" value={platform} onChange={e => setPlatform(e.target.value as MessagePlatform)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="messenger">Messenger</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Direccion</label>
            <input type="text" className="input-field" placeholder="Calle, Numero, Colonia, Ciudad, CP" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notas</label>
            <textarea className="input-field min-h-[80px] resize-y" placeholder="Notas adicionales..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
