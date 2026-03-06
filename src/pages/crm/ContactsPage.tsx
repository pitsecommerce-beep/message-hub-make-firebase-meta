import { useState } from 'react';
import {
  Search,
  Plus,
  Mail,
  Phone,
  Tag,
  MoreHorizontal,
  MessageSquare,
  ShoppingCart,
  X,
} from 'lucide-react';
import { demoContacts, demoOrders, demoConversations } from '@/utils/demo-data';
import { formatRelativeTime, getPlatformLabel, getInitials, classNames } from '@/utils/helpers';
import PlatformIcon from '@/components/shared/PlatformIcon';
import PageHeader from '@/components/shared/PageHeader';
import type { Contact } from '@/types';

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');

  const allTags = [...new Set(demoContacts.flatMap(c => c.tags))];

  const filtered = demoContacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search)) return false;
    if (tagFilter && !c.tags.includes(tagFilter)) return false;
    return true;
  });

  const contactOrders = selectedContact ? demoOrders.filter(o => o.contactId === selectedContact.id) : [];
  const contactConvos = selectedContact ? demoConversations.filter(c => c.contactId === selectedContact.id) : [];

  return (
    <div className="flex h-screen">
      <div className={classNames('flex-1 flex flex-col', selectedContact ? '' : '')}>
        <div className="p-6 pb-0">
          <PageHeader
            title="Contactos"
            subtitle={`${demoContacts.length} contactos en total`}
            actions={
              <button className="btn-primary text-sm flex items-center gap-2">
                <Plus size={16} /> Nuevo contacto
              </button>
            }
          />

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                className="input-field pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field w-auto"
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Contacto</th>
                  <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Plataforma</th>
                  <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Teléfono</th>
                  <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Etiquetas</th>
                  <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Último mensaje</th>
                  <th className="text-right text-xs font-medium text-surface-500 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr
                    key={contact.id}
                    className={classNames(
                      'border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors',
                      selectedContact?.id === contact.id ? 'bg-primary-50/50' : ''
                    )}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                          {getInitials(contact.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-800">{contact.name}</p>
                          {contact.email && <p className="text-xs text-surface-400">{contact.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <PlatformIcon platform={contact.platform} size={14} />
                        <span className="text-sm text-surface-600">{getPlatformLabel(contact.platform)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600">{contact.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(tag => (
                          <span key={tag} className="badge-neutral">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-400">
                      {formatRelativeTime(contact.lastMessageAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1 rounded hover:bg-surface-100 text-surface-400">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Contact Detail Panel */}
      {selectedContact && (
        <div className="w-80 border-l border-surface-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-800">Detalle</h3>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1 rounded hover:bg-surface-100 text-surface-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">
                {getInitials(selectedContact.name)}
              </div>
              <p className="font-semibold text-surface-900">{selectedContact.name}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <PlatformIcon platform={selectedContact.platform} size={14} />
                <span className="text-xs text-surface-500">{getPlatformLabel(selectedContact.platform)}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm mb-5">
              {selectedContact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-surface-400" />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-surface-400" />
                  <span>{selectedContact.email}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Tag size={14} className="text-surface-400 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {selectedContact.tags.map(t => (
                    <span key={t} className="badge-neutral">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {selectedContact.notes && (
              <div className="mb-5 p-3 rounded-lg bg-surface-50 text-sm text-surface-600">
                <p className="text-xs font-medium text-surface-400 mb-1">Notas</p>
                {selectedContact.notes}
              </div>
            )}

            {/* Conversations */}
            <div className="mb-5">
              <h4 className="text-xs font-medium text-surface-400 mb-2 flex items-center gap-1">
                <MessageSquare size={12} /> Conversaciones ({contactConvos.length})
              </h4>
              {contactConvos.map(c => (
                <div key={c.id} className="p-2 rounded-lg hover:bg-surface-50 cursor-pointer mb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PlatformIcon platform={c.platform} size={12} />
                      <span className="text-xs font-medium text-surface-700 capitalize">{c.status}</span>
                    </div>
                    <span className="text-xs text-surface-400">{formatRelativeTime(c.updatedAt)}</span>
                  </div>
                  <p className="text-xs text-surface-500 truncate mt-0.5">{c.lastMessage?.content}</p>
                </div>
              ))}
            </div>

            {/* Orders */}
            <div>
              <h4 className="text-xs font-medium text-surface-400 mb-2 flex items-center gap-1">
                <ShoppingCart size={12} /> Pedidos ({contactOrders.length})
              </h4>
              {contactOrders.map(o => (
                <div key={o.id} className="p-2 rounded-lg hover:bg-surface-50 cursor-pointer mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-surface-700">{o.orderNumber}</span>
                    <span className="text-xs text-surface-500 capitalize">{o.status}</span>
                  </div>
                  <p className="text-xs text-surface-400">{o.items.length} items - ${o.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
