import { useState } from 'react';
import {
  Search,
  Plus,
  List,
  LayoutGrid,
  Eye,
  X,
  MapPin,
  Truck,
} from 'lucide-react';
import { demoOrders } from '@/utils/demo-data';
import {
  formatCurrency,
  formatFullDate,
  getOrderStatusLabel,
  getOrderStatusColor,
  classNames,
  getInitials,
} from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { Order, OrderStatus } from '@/types';
import { ORDER_FUNNEL_STAGES } from '@/types';

type ViewMode = 'list' | 'funnel';

const FUNNEL_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-50 border-blue-200',
  confirmed: 'bg-indigo-50 border-indigo-200',
  processing: 'bg-amber-50 border-amber-200',
  packed: 'bg-orange-50 border-orange-200',
  shipped: 'bg-cyan-50 border-cyan-200',
  delivered: 'bg-emerald-50 border-emerald-200',
  cancelled: 'bg-red-50 border-red-200',
  returned: 'bg-red-50 border-red-200',
};

const FUNNEL_HEADER_COLORS: Record<OrderStatus, string> = {
  new: 'text-blue-700',
  confirmed: 'text-indigo-700',
  processing: 'text-amber-700',
  packed: 'text-orange-700',
  shipped: 'text-cyan-700',
  delivered: 'text-emerald-700',
  cancelled: 'text-red-700',
  returned: 'text-red-700',
};

export default function OrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = demoOrders.filter(o => {
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.contact?.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  const funnelData = ORDER_FUNNEL_STAGES.map(stage => ({
    stage,
    orders: demoOrders.filter(o => o.status === stage),
  }));

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <PageHeader
            title="Pedidos"
            subtitle={`${demoOrders.length} pedidos en total`}
            actions={
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={classNames(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-surface-400'
                    )}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('funnel')}
                    className={classNames(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'funnel' ? 'bg-white shadow-sm text-primary-600' : 'text-surface-400'
                    )}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
                <button className="btn-primary text-sm flex items-center gap-2">
                  <Plus size={16} /> Nuevo pedido
                </button>
              </div>
            }
          />

          {viewMode === 'list' && (
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder="Buscar pedido o contacto..."
                  className="input-field pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="input-field w-auto"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {ORDER_FUNNEL_STAGES.map(s => (
                  <option key={s} value={s}>{getOrderStatusLabel(s)}</option>
                ))}
                <option value="cancelled">Cancelado</option>
                <option value="returned">Devuelto</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {viewMode === 'list' ? (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Pedido</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Estado</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Items</th>
                    <th className="text-right text-xs font-medium text-surface-500 px-4 py-3">Total</th>
                    <th className="text-left text-xs font-medium text-surface-500 px-4 py-3">Fecha</th>
                    <th className="text-right text-xs font-medium text-surface-500 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr
                      key={order.id}
                      className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-primary-600">{order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                            {getInitials(order.contact?.name || '')}
                          </div>
                          <span className="text-sm text-surface-700">{order.contact?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600">{order.items.length}</td>
                      <td className="px-4 py-3 text-sm font-medium text-surface-800 text-right">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3 text-xs text-surface-400">{formatFullDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1 rounded hover:bg-surface-100 text-surface-400">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Funnel / Kanban view */
            <div className="flex gap-4 h-full overflow-x-auto pb-2">
              {funnelData.map(({ stage, orders }) => (
                <div key={stage} className="flex-shrink-0 w-72">
                  <div className={`rounded-xl border ${FUNNEL_COLORS[stage]} p-3`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-sm font-semibold ${FUNNEL_HEADER_COLORS[stage]}`}>
                        {getOrderStatusLabel(stage)}
                      </h3>
                      <span className="text-xs text-surface-500 bg-white/80 px-2 py-0.5 rounded-full">
                        {orders.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {orders.map(order => (
                        <div
                          key={order.id}
                          className="bg-white rounded-lg p-3 border border-surface-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-primary-600">{order.orderNumber}</span>
                            <span className="text-sm font-semibold text-surface-800">{formatCurrency(order.total)}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                              {getInitials(order.contact?.name || '')}
                            </div>
                            <span className="text-xs text-surface-600">{order.contact?.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-surface-400">
                            <span>{order.items.length} items</span>
                            <span>{formatFullDate(order.createdAt).split(',')[0]}</span>
                          </div>
                        </div>
                      ))}
                      {orders.length === 0 && (
                        <div className="text-center py-8 text-xs text-surface-400">
                          Sin pedidos
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail */}
      {selectedOrder && (
        <div className="w-96 border-l border-surface-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-800">Detalle del pedido</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded hover:bg-surface-100 text-surface-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-bold text-primary-600">{selectedOrder.orderNumber}</span>
              <span className={getOrderStatusColor(selectedOrder.status)}>{getOrderStatusLabel(selectedOrder.status)}</span>
            </div>

            <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-surface-50">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                {getInitials(selectedOrder.contact?.name || '')}
              </div>
              <div>
                <p className="text-sm font-medium text-surface-800">{selectedOrder.contact?.name}</p>
                <p className="text-xs text-surface-400">Cliente</p>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-xs font-medium text-surface-400 mb-2">Productos</h4>
              <div className="space-y-2">
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-50">
                    <div>
                      <p className="text-sm font-medium text-surface-800">{item.name}</p>
                      <p className="text-xs text-surface-400">
                        {item.sku && `${item.sku} · `}{item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-surface-700">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5 p-3 rounded-lg bg-surface-50 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Subtotal</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">IVA</span>
                <span>{formatCurrency(selectedOrder.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Envío</span>
                <span>{selectedOrder.shipping === 0 ? 'Gratis' : formatCurrency(selectedOrder.shipping)}</span>
              </div>
              <div className="flex justify-between font-semibold text-surface-900 pt-1.5 border-t border-surface-200">
                <span>Total</span>
                <span>{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {selectedOrder.shippingAddress && (
              <div className="mb-5">
                <h4 className="text-xs font-medium text-surface-400 mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Dirección de envío
                </h4>
                <p className="text-sm text-surface-700">{selectedOrder.shippingAddress}</p>
              </div>
            )}

            {selectedOrder.trackingNumber && (
              <div className="mb-5">
                <h4 className="text-xs font-medium text-surface-400 mb-1 flex items-center gap-1">
                  <Truck size={12} /> Número de rastreo
                </h4>
                <p className="text-sm text-primary-600 font-medium">{selectedOrder.trackingNumber}</p>
              </div>
            )}

            {selectedOrder.notes && (
              <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-0.5">Notas</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="text-xs text-surface-400">
              <p>Creado: {formatFullDate(selectedOrder.createdAt)}</p>
              <p>Actualizado: {formatFullDate(selectedOrder.updatedAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
