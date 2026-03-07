import { useState, useEffect } from 'react';
import { Search, Plus, List, LayoutGrid, Eye, X, MapPin, Truck, Trash2, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrders, getContacts, getProducts, createOrder } from '@/services/firestore';
import { formatCurrency, formatFullDate, getOrderStatusLabel, getOrderStatusColor, classNames, getInitials, generateOrderNumber } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import type { Order, OrderStatus, OrderItem, Contact, Product } from '@/types';
import { ORDER_FUNNEL_STAGES } from '@/types';

type ViewMode = 'list' | 'funnel';

const FUNNEL_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', confirmed: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800', processing: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  packed: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', shipped: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800', delivered: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  cancelled: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', returned: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};
const FUNNEL_HEADER_COLORS: Record<OrderStatus, string> = {
  new: 'text-blue-700 dark:text-blue-400', confirmed: 'text-indigo-700 dark:text-indigo-400', processing: 'text-amber-700 dark:text-amber-400', packed: 'text-orange-700 dark:text-orange-400',
  shipped: 'text-cyan-700 dark:text-cyan-400', delivered: 'text-emerald-700 dark:text-emerald-400', cancelled: 'text-red-700 dark:text-red-400', returned: 'text-red-700 dark:text-red-400',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  const loadOrders = async () => {
    if (!user?.teamId) return;
    const o = await getOrders(user.teamId).catch(() => []);
    setOrders(o);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user?.teamId]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = orders.filter(o => {
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.contact?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  const funnelData = ORDER_FUNNEL_STAGES.map(stage => ({ stage, orders: orders.filter(o => o.status === stage) }));

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <PageHeader title="Pedidos" subtitle={`${orders.length} pedidos en total`}
            actions={
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-surface-100 dark:bg-surface-700 rounded-lg p-0.5">
                  <button onClick={() => setViewMode('list')} className={classNames('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-white dark:bg-surface-600 shadow-sm text-primary-600' : 'text-surface-400')}><List size={18} /></button>
                  <button onClick={() => setViewMode('funnel')} className={classNames('p-1.5 rounded-md transition-colors', viewMode === 'funnel' ? 'bg-white dark:bg-surface-600 shadow-sm text-primary-600' : 'text-surface-400')}><LayoutGrid size={18} /></button>
                </div>
                <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Nuevo pedido</button>
              </div>
            } />
          {viewMode === 'list' && (
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Buscar pedido..." className="input-field pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <select className="input-field w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                {ORDER_FUNNEL_STAGES.map(s => <option key={s} value={s}>{getOrderStatusLabel(s)}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto px-6 pb-6">
          {orders.length === 0 ? <EmptyState icon="shopping-cart" title="Sin pedidos" description="Crea tu primer pedido con el boton de arriba." /> : viewMode === 'list' ? (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50"><th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Pedido</th><th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Cliente</th><th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Estado</th><th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Items</th><th className="text-right text-xs font-medium text-surface-500 px-4 py-3">Total</th><th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Fecha</th><th className="text-right text-xs font-medium text-surface-500 px-4 py-3"></th></tr></thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700/50 cursor-pointer transition-colors" onClick={() => setSelectedOrder(order)}>
                      <td className="px-4 py-3"><span className="text-sm font-medium text-primary-600">{order.orderNumber}</span></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xs font-semibold">{getInitials(order.contact?.name || '')}</div><span className="text-sm text-surface-700 dark:text-surface-300">{order.contact?.name || '-'}</span></div></td>
                      <td className="px-4 py-3"><span className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</span></td>
                      <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{order.items?.length || 0}</td>
                      <td className="px-4 py-3 text-sm font-medium text-surface-800 dark:text-surface-200 text-right">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3 text-xs text-surface-400">{formatFullDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-right"><button className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><Eye size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex gap-4 h-full overflow-x-auto pb-2">
              {funnelData.map(({ stage, orders: stageOrders }) => (
                <div key={stage} className="flex-shrink-0 w-72">
                  <div className={`rounded-xl border ${FUNNEL_COLORS[stage]} p-3`}>
                    <div className="flex items-center justify-between mb-3"><h3 className={`text-sm font-semibold ${FUNNEL_HEADER_COLORS[stage]}`}>{getOrderStatusLabel(stage)}</h3><span className="text-xs text-surface-500 bg-white/80 dark:bg-surface-800/80 px-2 py-0.5 rounded-full">{stageOrders.length}</span></div>
                    <div className="space-y-2">
                      {stageOrders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-surface-800 rounded-lg p-3 border border-surface-200 dark:border-surface-700 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)}>
                          <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-primary-600">{order.orderNumber}</span><span className="text-sm font-semibold text-surface-800 dark:text-surface-200">{formatCurrency(order.total)}</span></div>
                          <div className="text-xs text-surface-400">{order.items?.length || 0} items</div>
                        </div>
                      ))}
                      {stageOrders.length === 0 && <div className="text-center py-8 text-xs text-surface-400">Sin pedidos</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="w-96 border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-surface-800 dark:text-surface-200">Detalle</h3><button onClick={() => setSelectedOrder(null)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={16} /></button></div>
            <div className="flex items-center justify-between mb-4"><span className="text-lg font-bold text-primary-600">{selectedOrder.orderNumber}</span><span className={getOrderStatusColor(selectedOrder.status)}>{getOrderStatusLabel(selectedOrder.status)}</span></div>
            <div className="mb-5"><h4 className="text-xs font-medium text-surface-400 mb-2">Productos</h4><div className="space-y-2">{(selectedOrder.items || []).map(item => (<div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-700"><div><p className="text-sm font-medium text-surface-800 dark:text-surface-200">{item.name}</p><p className="text-xs text-surface-400">{item.sku && `SKU: ${item.sku} | `}{item.quantity} x {formatCurrency(item.unitPrice)}</p></div><span className="text-sm font-medium text-surface-700 dark:text-surface-300">{formatCurrency(item.total)}</span></div>))}</div></div>
            <div className="mb-5 p-3 rounded-lg bg-surface-50 dark:bg-surface-700 space-y-1.5 text-sm">
              <div className="flex justify-between text-surface-600 dark:text-surface-400"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
              <div className="flex justify-between text-surface-600 dark:text-surface-400"><span>IVA</span><span>{formatCurrency(selectedOrder.tax)}</span></div>
              <div className="flex justify-between text-surface-600 dark:text-surface-400"><span>Envio</span><span>{selectedOrder.shipping === 0 ? 'Gratis' : formatCurrency(selectedOrder.shipping)}</span></div>
              <div className="flex justify-between font-semibold text-surface-900 dark:text-surface-100 pt-1.5 border-t border-surface-200 dark:border-surface-600"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div>
            </div>
            {selectedOrder.shippingAddress && <div className="mb-5"><h4 className="text-xs font-medium text-surface-400 mb-1 flex items-center gap-1"><MapPin size={12} /> Direccion</h4><p className="text-sm text-surface-700 dark:text-surface-300">{selectedOrder.shippingAddress}</p></div>}
            {selectedOrder.trackingNumber && <div className="mb-5"><h4 className="text-xs font-medium text-surface-400 mb-1 flex items-center gap-1"><Truck size={12} /> Rastreo</h4><p className="text-sm text-primary-600 font-medium">{selectedOrder.trackingNumber}</p></div>}
            {selectedOrder.notes && <div className="mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800"><p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-0.5">Notas</p><p className="text-sm text-amber-800 dark:text-amber-300">{selectedOrder.notes}</p></div>}
          </div>
        </div>
      )}

      {showNewForm && (
        <NewOrderModal
          teamId={user?.teamId || ''}
          onClose={() => setShowNewForm(false)}
          onSaved={() => { setShowNewForm(false); loadOrders(); }}
        />
      )}
    </div>
  );
}

function NewOrderModal({ teamId, onClose, onSaved }: { teamId: string; onClose: () => void; onSaved: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contactId, setContactId] = useState('');
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ id: `item-${Date.now()}`, name: '', sku: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getContacts(teamId).catch(() => []),
      getProducts(teamId).catch(() => []),
    ]).then(([c, p]) => { setContacts(c); setProducts(p); });
  }, [teamId]);

  const addItem = () => {
    setItems(prev => [...prev, { id: `item-${Date.now()}`, name: '', sku: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice);
      }
      return updated;
    }));
  };

  const selectProduct = (idx: number, product: Product) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, name: product.name, sku: product.sku, unitPrice: product.unitPrice, total: item.quantity * product.unitPrice };
    }));
    setActiveItemIdx(null);
    setProductSearch('');
  };

  const selectContact = (contact: Contact) => {
    setContactId(contact.id);
    setClientName(contact.name);
    setContactSearch('');
  };

  const subtotal = items.reduce((s, item) => s + item.total, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const filteredContacts = contactSearch ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone?.includes(contactSearch)) : [];
  const filteredProducts = productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())) : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.every(i => !i.name)) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      await createOrder(teamId, {
        teamId,
        contactId: contactId || '',
        orderNumber: generateOrderNumber(),
        status: 'new',
        items: items.filter(i => i.name),
        subtotal,
        tax,
        shipping: 0,
        total,
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now,
      } as Omit<Order, 'id'>);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear pedido');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Nuevo pedido</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Cliente</label>
            <div className="relative">
              <input
                type="text"
                className="input-field"
                placeholder="Buscar contacto existente..."
                value={clientName || contactSearch}
                onChange={e => { setContactSearch(e.target.value); setClientName(''); setContactId(''); }}
              />
              {filteredContacts.length > 0 && !clientName && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600 shadow-lg max-h-40 overflow-y-auto">
                  {filteredContacts.slice(0, 5).map(c => (
                    <button key={c.id} type="button" onClick={() => selectContact(c)} className="w-full text-left px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-600 text-sm text-surface-700 dark:text-surface-300 transition-colors">
                      {c.name} {c.company && <span className="text-surface-400">- {c.company}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Productos</label>
              <button type="button" onClick={addItem} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Plus size={12} /> Agregar producto</button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Nombre del producto o buscar..."
                        value={item.name || (activeItemIdx === idx ? productSearch : '')}
                        onChange={e => {
                          if (products.length > 0) {
                            setProductSearch(e.target.value);
                            setActiveItemIdx(idx);
                            updateItem(idx, 'name', e.target.value);
                          } else {
                            updateItem(idx, 'name', e.target.value);
                          }
                        }}
                        onFocus={() => setActiveItemIdx(idx)}
                      />
                      {activeItemIdx === idx && filteredProducts.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600 shadow-lg max-h-32 overflow-y-auto">
                          {filteredProducts.slice(0, 5).map(p => (
                            <button key={p.id} type="button" onClick={() => selectProduct(idx, p)} className="w-full text-left px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-600 text-sm text-surface-700 dark:text-surface-300 transition-colors">
                              <span className="font-medium">{p.name}</span> <span className="text-surface-400">SKU: {p.sku} - {formatCurrency(p.unitPrice)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500"><Trash2 size={14} /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-surface-500 mb-0.5">SKU</label>
                      <input type="text" className="input-field text-xs py-1.5" placeholder="SKU" value={item.sku || ''} onChange={e => updateItem(idx, 'sku', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-500 mb-0.5">Cantidad</label>
                      <input type="number" className="input-field text-xs py-1.5" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-500 mb-0.5">Precio unit.</label>
                      <input type="number" className="input-field text-xs py-1.5" min={0} step={0.01} value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-500 mb-0.5">Total</label>
                      <div className="input-field text-xs py-1.5 bg-surface-50 dark:bg-surface-700 font-medium">{formatCurrency(item.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-700 space-y-1.5 text-sm">
            <div className="flex justify-between text-surface-600 dark:text-surface-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-surface-600 dark:text-surface-400"><span>IVA (16%)</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between font-semibold text-surface-900 dark:text-surface-100 pt-1.5 border-t border-surface-200 dark:border-surface-600"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Direccion de envio</label>
            <input type="text" className="input-field" placeholder="Calle, Numero, Colonia, Ciudad, CP" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notas</label>
            <textarea className="input-field min-h-[60px] resize-y" placeholder="Notas del pedido..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Creando...' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
