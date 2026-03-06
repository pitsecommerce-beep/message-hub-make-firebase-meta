import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Send,
  Bot,
  Phone,
  MoreVertical,
  Filter,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock,
  ShoppingCart,
  User,
  X,
  MessageSquare,
} from 'lucide-react';
import { demoConversations, demoMessages, demoContacts } from '@/utils/demo-data';
import { formatMessageTime, classNames, getPlatformLabel, getInitials } from '@/utils/helpers';
import PlatformIcon from '@/components/shared/PlatformIcon';
import type { Conversation, Message, MessagePlatform } from '@/types';

type FilterPlatform = 'all' | MessagePlatform;
type FilterStatus = 'all' | 'open' | 'pending' | 'closed';

export default function ConversationsPage() {
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(demoConversations[0]);
  const [messages, setMessages] = useState<Message[]>(demoMessages['conv1'] || []);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = demoConversations.filter(c => {
    if (searchQuery && !c.contact?.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const handleSelectConvo = (convo: Conversation) => {
    setSelectedConvo(convo);
    setMessages(demoMessages[convo.id] || []);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConvo) return;
    const msg: Message = {
      id: `m-${Date.now()}`,
      conversationId: selectedConvo.id,
      contactId: selectedConvo.contactId,
      teamId: selectedConvo.teamId,
      direction: 'outbound',
      platform: selectedConvo.platform,
      content: newMessage.trim(),
      messageType: 'text',
      status: 'sent',
      sentBy: 'current-user',
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const selectedContact = selectedConvo ? demoContacts.find(c => c.id === selectedConvo.contactId) : null;

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
      <div className="w-80 border-r border-surface-200 flex flex-col bg-white flex-shrink-0">
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-surface-900">Mensajes</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={classNames(
                'p-2 rounded-lg transition-colors',
                showFilters ? 'bg-primary-50 text-primary-600' : 'hover:bg-surface-100 text-surface-400'
              )}
            >
              <Filter size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              className="input-field pl-9 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {showFilters && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <select
                className="input-field py-1.5 text-xs w-auto"
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value as FilterPlatform)}
              >
                <option value="all">Todas las plataformas</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="messenger">Messenger</option>
                <option value="instagram">Instagram</option>
              </select>
              <select
                className="input-field py-1.5 text-xs w-auto"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abierta</option>
                <option value="pending">Pendiente</option>
                <option value="closed">Cerrada</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => handleSelectConvo(convo)}
              className={classNames(
                'w-full flex items-start gap-3 p-4 border-b border-surface-100 text-left transition-colors hover:bg-surface-50',
                selectedConvo?.id === convo.id ? 'bg-primary-50/50' : ''
              )}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                  {getInitials(convo.contact?.name || '')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <PlatformIcon platform={convo.platform} size={14} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-800 truncate">{convo.contact?.name}</span>
                  <span className="text-xs text-surface-400 flex-shrink-0 ml-2">
                    {formatMessageTime(convo.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-surface-500 truncate flex-1">
                    {convo.aiEnabled && <Bot size={12} className="inline mr-1 text-violet-500" />}
                    {convo.lastMessage?.content}
                  </p>
                  {convo.unreadCount > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                      {convo.unreadCount}
                    </span>
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
          {/* Chat Header */}
          <div className="h-16 px-4 border-b border-surface-200 flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                {getInitials(selectedConvo.contact?.name || '')}
              </div>
              <div>
                <p className="text-sm font-medium text-surface-800">{selectedConvo.contact?.name}</p>
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <PlatformIcon platform={selectedConvo.platform} size={12} />
                  <span>{getPlatformLabel(selectedConvo.platform)}</span>
                  {selectedConvo.aiEnabled && (
                    <span className="badge bg-violet-50 text-violet-600 ml-1">
                      <Bot size={10} className="mr-1" /> IA activa
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowContactPanel(!showContactPanel)}
                className={classNames(
                  'p-2 rounded-lg transition-colors',
                  showContactPanel ? 'bg-primary-50 text-primary-600' : 'hover:bg-surface-100 text-surface-400'
                )}
                title="Info del contacto"
              >
                <User size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-surface-100 text-surface-400" title="Llamar">
                <Phone size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-surface-100 text-surface-400">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Messages */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={classNames(
                      'flex',
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={classNames(
                        'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                        msg.direction === 'outbound'
                          ? 'bg-primary-500 text-white rounded-br-md'
                          : 'bg-white text-surface-800 border border-surface-200 rounded-bl-md'
                      )}
                    >
                      {msg.isAiGenerated && msg.direction === 'outbound' && (
                        <div className="flex items-center gap-1 mb-1 opacity-75">
                          <Bot size={11} />
                          <span className="text-xs">IA</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className={classNames(
                        'flex items-center justify-end gap-1 mt-1',
                        msg.direction === 'outbound' ? 'text-white/70' : 'text-surface-400'
                      )}>
                        <span className="text-xs">{formatMessageTime(msg.createdAt)}</span>
                        {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-surface-200 bg-white">
                <div className="flex items-end gap-2">
                  <button className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 flex-shrink-0">
                    <Paperclip size={20} />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      className="input-field py-2.5 pr-10 resize-none min-h-[42px] max-h-32"
                      placeholder="Escribe un mensaje..."
                      rows={1}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <button className="absolute right-2 bottom-2 p-1 rounded text-surface-400 hover:text-surface-600">
                      <Smile size={18} />
                    </button>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-30"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Panel */}
            {showContactPanel && selectedContact && (
              <div className="w-72 border-l border-surface-200 bg-white overflow-y-auto flex-shrink-0">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-surface-800">Contacto</h3>
                    <button
                      onClick={() => setShowContactPanel(false)}
                      className="p-1 rounded hover:bg-surface-100 text-surface-400"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">
                      {getInitials(selectedContact.name)}
                    </div>
                    <p className="font-medium text-surface-800">{selectedContact.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <PlatformIcon platform={selectedContact.platform} size={14} />
                      <span className="text-xs text-surface-500">{getPlatformLabel(selectedContact.platform)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {selectedContact.phone && (
                      <div>
                        <p className="text-xs text-surface-400 mb-0.5">Teléfono</p>
                        <p className="text-surface-700">{selectedContact.phone}</p>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div>
                        <p className="text-xs text-surface-400 mb-0.5">Email</p>
                        <p className="text-surface-700">{selectedContact.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-surface-400 mb-1">Etiquetas</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedContact.tags.map(tag => (
                          <span key={tag} className="badge-neutral text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {selectedContact.notes && (
                      <div>
                        <p className="text-xs text-surface-400 mb-0.5">Notas</p>
                        <p className="text-surface-600 text-xs">{selectedContact.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-surface-200">
                    <button className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                      <ShoppingCart size={14} />
                      Ver pedidos
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-surface-50">
          <div className="text-center text-surface-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecciona una conversación</p>
          </div>
        </div>
      )}
    </div>
  );
}
