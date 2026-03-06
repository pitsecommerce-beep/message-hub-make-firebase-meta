import { useState, useEffect } from 'react';
import { Package, Search, Truck, Clock, X, MapPin, ArrowRight, Box, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrders, updateOrder } from '@/services/firestore';
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor, classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { Order, OrderStatus } from '@/types';

const WMS_STAGES: { status: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'confirmed', label: 'Por preparar', icon: <ClipboardCheck size={18} />, color: 'text-blue-600 bg-blue-50' },
  { status: 'processing', label: 'En proceso', icon: <Clock size={18} />, color: 'text-amber-600 bg-amber-50' },
  { status: 'packed', label: 'Empacados', icon: <Box size={18} />, color: 'text-orange-600 bg-orange-50' },
  { status: 'shipped', label: 'Enviados', icon: <Truck size={18} />, color: 'text-cyan-600 bg-cyan-50' },
];

export default function WarehousePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<OrderStatus>('confirmed');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (!user?.teamId) return;
    const o = await getOrders(user.teamId).catch(() => []);
    setOrders(o);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user?.teamId]);

  const wmsOrders = orders.filter(o => ['confirmed', 'processing', 'packed', 'shipped'].includes(o.status));
  const tabOrders = wmsOrders.filter(o => {
    if (o.status !== activeTab) return false;
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const flow: Record<string, OrderStatus> = { confirmed: 'processing', processing: 'packed', packed: 'shipped' };
    return flow[current] || null;
  };

  const handleAdvanceStatus = async (order: Order) => {
    const next = getNextStatus(order.status);
    if (!next || !user?.teamId) return;
    await updateOrder(user.teamId, order.id, { status: next, updatedAt: new Date().toISOString() });
    setSelectedOrder(null);
    loadOrders();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <PageHeader title="Almacén (WMS)" subtitle={`${wmsOrders.length} pedidos en proceso`} />
          <div className="grid grid-cols-4 gap-3 mb-5">
            {WMS_STAGES.map(stage => {
              const count = orders.filter(o => o.status === stage.status).length;
              return (
                <button key={stage.status} onClick={() => setActiveTab(stage.status)} className={classNames('card p-4 text-left transition-all', activeTab === stage.status ? 'ring-2 ring-primary-300 shadow-md' : 'hover:shadow-md')}>
                  <div className={`w-9 h-9 rounded-lg ${stage.color} flex items-center justify-center mb-2`}>{stage.icon}</div>
                  <p className="text-xl font-bold text-surface-900">{count}</p>
                  <p className="text-xs text-surface-500">{stage.label}</p>
                </button>
              );
            })}
          </div>
          <div className="relative max-w-md mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Buscar pedido..." className="input-field pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-2">
            {tabOrders.map(order => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className={classNames('card p-4 cursor-pointer transition-all hover:shadow-md', selectedOrder?.id === order.id ? 'ring-2 ring-primary-300' : '')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center text-surface-500"><Package size={20} /></div><div><p className="text-sm font-semibold text-primary-600">{order.orderNumber}</p><p className="text-xs text-surface-400">{order.contact?.name || '-'} - {order.items?.length || 0} items</p></div></div>
                  <div className="flex items-center gap-3"><span className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</span><span className="text-sm font-medium text-surface-700">{formatCurrency(order.total)}</span></div>
                </div>
                {(order.items || []).length > 0 && <div className="mt-3 flex items-center gap-2 flex-wrap">{order.items.map(item => <span key={item.id} className="badge-neutral text-xs">{item.quantity}x {item.name}</span>)}</div>}
              </div>
            ))}
            {tabOrders.length === 0 && <div className="text-center py-16 text-surface-400"><Package size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No hay pedidos en esta etapa</p></div>}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="w-96 border-l border-surface-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-surface-800">Detalle</h3><button onClick={() => setSelectedOrder(null)} className="p-1 rounded hover:bg-surface-100 text-surface-400"><X size={16} /></button></div>
            <div className="flex items-center justify-between mb-4"><span className="text-lg font-bold text-primary-600">{selectedOrder.orderNumber}</span><span className={getOrderStatusColor(selectedOrder.status)}>{getOrderStatusLabel(selectedOrder.status)}</span></div>
            <div className="mb-5"><h4 className="text-xs font-medium text-surface-400 mb-2">Productos</h4><div className="space-y-2">{(selectedOrder.items || []).map(item => (<div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200"><div className="w-8 h-8 rounded bg-surface-100 flex items-center justify-center text-surface-500"><Box size={16} /></div><div className="flex-1"><p className="text-sm font-medium text-surface-800">{item.name}</p><p className="text-xs text-surface-400">{item.sku || 'Sin SKU'}</p></div><p className="text-sm font-bold text-surface-800">x{item.quantity}</p></div>))}</div></div>
            {selectedOrder.shippingAddress && <div className="mb-5"><h4 className="text-xs font-medium text-surface-400 mb-1 flex items-center gap-1"><MapPin size={12} /> Enviar a</h4><p className="text-sm text-surface-700 p-2 rounded-lg bg-surface-50">{selectedOrder.shippingAddress}</p></div>}
            {selectedOrder.trackingNumber && <div className="mb-5"><h4 className="text-xs font-medium text-surface-400 mb-1 flex items-center gap-1"><Truck size={12} /> Guía</h4><p className="text-sm font-medium text-primary-600">{selectedOrder.trackingNumber}</p></div>}
            {selectedOrder.notes && <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-100"><p className="text-xs font-medium text-amber-700 mb-0.5">Notas</p><p className="text-sm text-amber-800">{selectedOrder.notes}</p></div>}
            {getNextStatus(selectedOrder.status) && <button onClick={() => handleAdvanceStatus(selectedOrder)} className="btn-primary w-full flex items-center justify-center gap-2">Avanzar a {getOrderStatusLabel(getNextStatus(selectedOrder.status)!)}<ArrowRight size={16} /></button>}
          </div>
        </div>
      )}
    </div>
  );
}
