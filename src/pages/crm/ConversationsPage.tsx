import { useState, useRef, useEffect } from 'react';
import { Search, Send, Bot, Phone, MoreVertical, Filter, Paperclip, Smile, Check, CheckCheck, Clock, ShoppingCart, User, X, MessageSquare, Plus, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeConversations, subscribeContacts, subscribeMessages, sendMessage as sendFirestoreMessage, updateConversation, getContacts, createContact, createConversation, findConversationByContact } from '@/services/firestore';
import { formatMessageTime, classNames, getPlatformLabel, getInitials } from '@/utils/helpers';
import PlatformIcon from '@/components/shared/PlatformIcon';
import type { Conversation, Message, MessagePlatform, Contact } from '@/types';

type FilterPlatform = 'all' | MessagePlatform;
type FilterStatus = 'all' | 'open' | 'pending' | 'closed';

export default function ConversationsPage() {
  const { user } = useAuth();
  const [rawConversations, setRawConversations] = useState<Conversation[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, Contact>>({});
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to contacts for enriching conversations
  useEffect(() => {
    if (!user?.teamId) return;
    const unsub = subscribeContacts(user.teamId, (contacts) => {
      const map: Record<string, Contact> = {};
      contacts.forEach(c => { map[c.id] = c; });
      setContactsMap(map);
    });
    return () => unsub();
  }, [user?.teamId]);

  // Subscribe to conversations
  useEffect(() => {
    if (!user?.teamId) return;
    const unsub = subscribeConversations(user.teamId, setRawConversations);
    return () => unsub();
  }, [user?.teamId]);

  // Enrich conversations with contact data
  const conversations = rawConversations.map(convo => ({
    ...convo,
    contact: contactsMap[convo.contactId] || convo.contact,
  }));

  // Keep selectedConvo in sync with enriched conversations
  useEffect(() => {
    if (!selectedConvo) return;
    const updated = conversations.find(c => c.id === selectedConvo.id);
    if (updated && (updated.contact?.name !== selectedConvo.contact?.name || updated.lastMessage?.content !== selectedConvo.lastMessage?.content)) {
      setSelectedConvo(updated);
    }
  }, [conversations, selectedConvo]);

  // Subscribe to messages when selecting a conversation
  useEffect(() => {
    if (!user?.teamId || !selectedConvo) return;
    const unsub = subscribeMessages(user.teamId, selectedConvo.id, setMessages);
    // Mark as read
    if (selectedConvo.unreadCount > 0) {
      updateConversation(user.teamId, selectedConvo.id, { unreadCount: 0 }).catch(() => {});
    }
    return () => unsub();
  }, [user?.teamId, selectedConvo?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(c => {
    if (searchQuery && !c.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const handleSelectConvo = (convo: Conversation) => {
    setSelectedConvo(convo);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConvo || !user) return;
    const content = newMessage.trim();
    setNewMessage('');
    try {
      await sendFirestoreMessage(user.teamId, {
        conversationId: selectedConvo.id,
        contactId: selectedConvo.contactId,
        teamId: user.teamId,
        direction: 'outbound',
        platform: selectedConvo.platform,
        content,
        messageType: 'text',
        status: 'sent',
        sentBy: user.uid,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
      });
      await updateConversation(user.teamId, selectedConvo.id, {
        updatedAt: new Date().toISOString(),
        lastMessage: { content, createdAt: new Date().toISOString(), direction: 'outbound' } as Message,
      });
    } catch {
      // Message will appear via subscription
    }
  };

  const handleConversationCreated = (convoId: string) => {
    setShowNewConvoModal(false);
    // The conversation will appear via the subscription - find and select it
    const interval = setInterval(() => {
      const found = conversations.find(c => c.id === convoId);
      if (found) {
        setSelectedConvo(found);
        clearInterval(interval);
      }
    }, 500);
    // Clear after 5s to avoid memory leak
    setTimeout(() => clearInterval(interval), 5000);
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent': return <Check size={14} className="text-surface-400" />;
      case 'delivered': return <CheckCheck size={14} className="text-surface-400" />;
      case 'read': return <CheckCheck size={14} className="text-primary-500" />;
      case 'failed': return <Clock size={14} className="text-danger" />;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Conversation List */}
      <div className="w-80 border-r border-surface-200 dark:border-surface-700 flex flex-col bg-white dark:bg-surface-800 flex-shrink-0">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Mensajes</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewConvoModal(true)}
                className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 dark:text-primary-400 transition-colors"
                title="Nueva conversación"
              >
                <Plus size={18} />
              </button>
              <button onClick={() => setShowFilters(!showFilters)} className={classNames('p-2 rounded-lg transition-colors', showFilters ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400')}>
                <Filter size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input type="text" placeholder="Buscar conversación..." className="input-field pl-9 py-2" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {showFilters && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <select className="input-field py-1.5 text-xs w-auto" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as FilterPlatform)}>
                <option value="all">Todas las plataformas</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="messenger">Messenger</option>
                <option value="instagram">Instagram</option>
              </select>
              <select className="input-field py-1.5 text-xs w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}>
                <option value="all">Todos los estados</option>
                <option value="open">Abierta</option>
                <option value="pending">Pendiente</option>
                <option value="closed">Cerrada</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <div className="text-center py-16 text-surface-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin conversaciones</p>
              <button
                onClick={() => setShowNewConvoModal(true)}
                className="mt-3 text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Iniciar una nueva
              </button>
            </div>
          )}
          {filteredConversations.map((convo) => (
            <button key={convo.id} onClick={() => handleSelectConvo(convo)}
              className={classNames('w-full flex items-start gap-3 p-4 border-b border-surface-100 dark:border-surface-700 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50', selectedConvo?.id === convo.id ? 'bg-primary-50/50 dark:bg-primary-900/20' : '')}>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-sm font-semibold">
                  {getInitials(convo.contact?.name || '?')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5"><PlatformIcon platform={convo.platform} size={14} /></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{convo.contact?.name || 'Contacto'}</span>
                  <span className="text-xs text-surface-400 flex-shrink-0 ml-2">{formatMessageTime(convo.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-surface-500 truncate flex-1">
                    {convo.aiEnabled && <Bot size={12} className="inline mr-1 text-violet-500" />}
                    {convo.lastMessage?.content || 'Sin mensajes'}
                  </p>
                  {convo.unreadCount > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center flex-shrink-0">{convo.unreadCount}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConvo ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 px-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between bg-white dark:bg-surface-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-sm font-semibold">
                {getInitials(selectedConvo.contact?.name || '?')}
              </div>
              <div>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{selectedConvo.contact?.name || 'Contacto'}</p>
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <PlatformIcon platform={selectedConvo.platform} size={12} />
                  <span>{getPlatformLabel(selectedConvo.platform)}</span>
                  {selectedConvo.aiEnabled && <span className="badge bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 ml-1"><Bot size={10} className="mr-1" /> IA</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (!user?.teamId || !selectedConvo) return;
                  const newVal = !selectedConvo.aiEnabled;
                  await updateConversation(user.teamId, selectedConvo.id, { aiEnabled: newVal });
                  setSelectedConvo({ ...selectedConvo, aiEnabled: newVal });
                }}
                className={classNames(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  selectedConvo.aiEnabled
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-600'
                )}
                title={selectedConvo.aiEnabled ? 'Desactivar agente IA' : 'Activar agente IA'}
              >
                <Bot size={14} />
                {selectedConvo.aiEnabled ? 'IA Activa' : 'IA Inactiva'}
              </button>
              <button onClick={() => setShowContactPanel(!showContactPanel)} className={classNames('p-2 rounded-lg transition-colors', showContactPanel ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400')}>
                <User size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><Phone size={18} /></button>
              <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><MoreVertical size={18} /></button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-50 dark:bg-surface-900/50">
                {messages.length === 0 && (
                  <div className="text-center py-16 text-surface-400">
                    <p className="text-sm">Sin mensajes aún</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={classNames('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div className={classNames('max-w-[70%] rounded-2xl px-4 py-2.5 text-sm', msg.direction === 'outbound' ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded-bl-md')}>
                      {msg.isAiGenerated && msg.direction === 'outbound' && (
                        <div className="flex items-center gap-1 mb-1 opacity-75"><Bot size={11} /><span className="text-xs">IA</span></div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className={classNames('flex items-center justify-end gap-1 mt-1', msg.direction === 'outbound' ? 'text-white/70' : 'text-surface-400')}>
                        <span className="text-xs">{formatMessageTime(msg.createdAt)}</span>
                        {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
                <div className="flex items-end gap-2">
                  <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 flex-shrink-0"><Paperclip size={20} /></button>
                  <div className="flex-1 relative">
                    <textarea className="input-field py-2.5 pr-10 resize-none min-h-[42px] max-h-32" placeholder="Escribe un mensaje..." rows={1} value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                    <button className="absolute right-2 bottom-2 p-1 rounded text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"><Smile size={18} /></button>
                  </div>
                  <button onClick={handleSend} disabled={!newMessage.trim()} className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-30"><Send size={18} /></button>
                </div>
              </div>
            </div>

            {showContactPanel && selectedConvo.contact && (
              <div className="w-72 border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-y-auto flex-shrink-0">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Contacto</h3>
                    <button onClick={() => setShowContactPanel(false)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={16} /></button>
                  </div>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xl font-semibold mx-auto mb-2">
                      {getInitials(selectedConvo.contact.name)}
                    </div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">{selectedConvo.contact.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <PlatformIcon platform={selectedConvo.contact.platform} size={14} />
                      <span className="text-xs text-surface-500">{getPlatformLabel(selectedConvo.contact.platform)}</span>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    {selectedConvo.contact.phone && <div><p className="text-xs text-surface-400 mb-0.5">Teléfono</p><p className="text-surface-700 dark:text-surface-300">{selectedConvo.contact.phone}</p></div>}
                    {selectedConvo.contact.email && <div><p className="text-xs text-surface-400 mb-0.5">Email</p><p className="text-surface-700 dark:text-surface-300">{selectedConvo.contact.email}</p></div>}
                    {selectedConvo.contact.tags?.length > 0 && (
                      <div>
                        <p className="text-xs text-surface-400 mb-1">Etiquetas</p>
                        <div className="flex flex-wrap gap-1">{selectedConvo.contact.tags.map(tag => <span key={tag} className="badge-neutral text-xs">{tag}</span>)}</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <button className="btn-secondary w-full text-sm flex items-center justify-center gap-2"><ShoppingCart size={14} /> Ver pedidos</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-surface-50 dark:bg-surface-900/50">
          <div className="text-center text-surface-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-3">Selecciona una conversación</p>
            <button
              onClick={() => setShowNewConvoModal(true)}
              className="btn-primary text-sm flex items-center gap-2 mx-auto"
            >
              <Plus size={16} /> Nueva conversación
            </button>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConvoModal && user?.teamId && (
        <NewConversationModal
          teamId={user.teamId}
          userId={user.uid}
          onClose={() => setShowNewConvoModal(false)}
          onCreated={handleConversationCreated}
        />
      )}
    </div>
  );
}

// --- New Conversation Modal ---
type ContactMode = 'existing' | 'new';

function NewConversationModal({
  teamId,
  userId,
  onClose,
  onCreated,
}: {
  teamId: string;
  userId: string;
  onClose: () => void;
  onCreated: (convoId: string) => void;
}) {
  const [mode, setMode] = useState<ContactMode>('existing');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  // New contact fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlatform, setNewPlatform] = useState<MessagePlatform>('whatsapp');

  useEffect(() => {
    getContacts(teamId)
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [teamId]);

  const filteredContacts = contactSearch
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.phone?.includes(contactSearch) ||
        c.email?.toLowerCase().includes(contactSearch.toLowerCase())
      )
    : contacts;

  const handleCreate = async () => {
    setError('');

    if (mode === 'existing' && !selectedContact) {
      setError('Selecciona un contacto');
      return;
    }
    if (mode === 'new' && !newName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (mode === 'new' && newPlatform === 'whatsapp' && !newPhone.trim()) {
      setError('El teléfono es obligatorio para WhatsApp');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();

    try {
      let contactId: string;
      let contactPlatform: MessagePlatform;
      let contactPhone: string | undefined;

      if (mode === 'new') {
        // Create the new contact first
        const phone = newPhone.trim().replace(/\s+/g, '');
        contactId = await createContact(teamId, {
          teamId,
          name: newName.trim(),
          phone: phone || undefined,
          email: newEmail.trim() || undefined,
          platform: newPlatform,
          platformId: phone || `manual-${Date.now()}`,
          tags: [],
          notes: '',
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
        } as Omit<Contact, 'id'>);
        contactPlatform = newPlatform;
        contactPhone = phone || undefined;
      } else {
        contactId = selectedContact!.id;
        contactPlatform = selectedContact!.platform;
        contactPhone = selectedContact!.phone;
      }

      // Check for existing conversation with same contact and platform
      const existingConvo = await findConversationByContact(teamId, contactId, contactPlatform);
      let convoId: string;

      if (existingConvo) {
        convoId = existingConvo.id;
        // Reopen the conversation if it was closed
        if (existingConvo.status === 'closed') {
          await updateConversation(teamId, convoId, { status: 'open', updatedAt: now });
        }
      } else {
        // Create conversation
        convoId = await createConversation(teamId, {
          teamId,
          contactId,
          platform: contactPlatform,
          status: 'open',
          aiEnabled: false,
          unreadCount: 0,
          createdAt: now,
          updatedAt: now,
        } as Omit<Conversation, 'id'>);
      }

      // Send first message if provided
      if (firstMessage.trim()) {
        await sendFirestoreMessage(teamId, {
          conversationId: convoId,
          contactId,
          teamId,
          direction: 'outbound',
          platform: contactPlatform,
          content: firstMessage.trim(),
          messageType: 'text',
          status: 'sent',
          sentBy: userId,
          isAiGenerated: false,
          createdAt: now,
          metadata: contactPhone ? { webhookPending: true, recipientPhone: contactPhone } : undefined,
        });

        await updateConversation(teamId, convoId, {
          lastMessage: {
            content: firstMessage.trim(),
            createdAt: now,
            direction: 'outbound',
          } as Message,
        });
      }

      onCreated(convoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la conversación');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Nueva conversación</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</div>}

          {/* Mode toggle */}
          <div className="flex bg-surface-100 dark:bg-surface-700 rounded-lg p-1">
            <button
              onClick={() => { setMode('existing'); setSelectedContact(null); }}
              className={classNames(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
                mode === 'existing'
                  ? 'bg-white dark:bg-surface-600 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              )}
            >
              <User size={16} /> Contacto existente
            </button>
            <button
              onClick={() => { setMode('new'); setSelectedContact(null); }}
              className={classNames(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
                mode === 'new'
                  ? 'bg-white dark:bg-surface-600 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              )}
            >
              <UserPlus size={16} /> Nuevo contacto
            </button>
          </div>

          {/* Existing contact selector */}
          {mode === 'existing' && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Buscar contacto</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="Nombre, teléfono o email..."
                  value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setSelectedContact(null); }}
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6 text-surface-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-6 text-sm text-surface-400">
                      <p>Sin resultados</p>
                      <button onClick={() => setMode('new')} className="text-primary-600 dark:text-primary-400 hover:underline mt-1 text-xs">
                        Crear nuevo contacto
                      </button>
                    </div>
                  ) : (
                    filteredContacts.slice(0, 20).map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={classNames(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0 border-surface-100 dark:border-surface-700',
                          selectedContact?.id === contact.id
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
                            {getInitials(contact.name)}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PlatformIcon platform={contact.platform} size={12} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{contact.name}</p>
                          <p className="text-xs text-surface-400 truncate">
                            {contact.phone || contact.email || getPlatformLabel(contact.platform)}
                          </p>
                        </div>
                        {selectedContact?.id === contact.id && (
                          <Check size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* New contact form */}
          {mode === 'new' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Plataforma</label>
                <div className="flex gap-2">
                  {(['whatsapp', 'messenger', 'instagram'] as MessagePlatform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewPlatform(p)}
                      className={classNames(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                        newPlatform === p
                          ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                          : 'border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300 dark:hover:border-surface-600'
                      )}
                    >
                      <PlatformIcon platform={p} size={16} />
                      <span>{getPlatformLabel(p)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Nombre *</label>
                <input type="text" className="input-field" placeholder="Nombre del contacto" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Teléfono {newPlatform === 'whatsapp' && <span className="text-red-500">*</span>}
                </label>
                <input type="tel" className="input-field" placeholder="+52 1 55 1234 5678" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                {newPlatform === 'whatsapp' && (
                  <p className="text-xs text-surface-400 mt-1">Incluye código de país (ej. +521 para México)</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
                <input type="email" className="input-field" placeholder="correo@ejemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
            </div>
          )}

          {/* First message */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Primer mensaje <span className="text-surface-400 font-normal">(opcional)</span>
            </label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Escribe el primer mensaje de la conversación..."
              value={firstMessage}
              onChange={e => setFirstMessage(e.target.value)}
            />
            {firstMessage.trim() && (mode === 'new' ? newPlatform : selectedContact?.platform) === 'whatsapp' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Check size={12} /> Se enviará vía yCloud/Make al número de WhatsApp
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 pt-0">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {saving ? 'Creando...' : 'Iniciar conversación'}
          </button>
        </div>
      </div>
    </div>
  );
}
