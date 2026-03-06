import {
  MessageSquare,
  Users,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  Bot,
  Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { demoConversations, demoContacts, demoOrders } from '@/utils/demo-data';
import { formatCurrency } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';

export default function DashboardPage() {
  const { user, hasModule } = useAuth();

  const openConvos = demoConversations.filter(c => c.status === 'open').length;
  const totalContacts = demoContacts.length;
  const pendingOrders = demoOrders.filter(o => ['new', 'confirmed', 'processing'].includes(o.status)).length;
  const totalRevenue = demoOrders.filter(o => o.status !== 'cancelled' && o.status !== 'returned').reduce((s, o) => s + o.total, 0);

  const stats = [
    { label: 'Conversaciones abiertas', value: openConvos, icon: <MessageSquare size={20} />, color: 'text-primary-600 bg-primary-50', show: hasModule('crm') },
    { label: 'Contactos totales', value: totalContacts, icon: <Users size={20} />, color: 'text-emerald-600 bg-emerald-50', show: hasModule('crm') },
    { label: 'Pedidos pendientes', value: pendingOrders, icon: <ShoppingCart size={20} />, color: 'text-amber-600 bg-amber-50', show: true },
    { label: 'Ingresos totales', value: formatCurrency(totalRevenue), icon: <TrendingUp size={20} />, color: 'text-violet-600 bg-violet-50', show: hasModule('crm') },
  ].filter(s => s.show);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title={`Bienvenido, ${user?.displayName?.split(' ')[0] || 'Usuario'}`}
        subtitle="Aquí tienes un resumen de tu actividad"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <ArrowUpRight size={16} className="text-surface-400" />
            </div>
            <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
            <p className="text-sm text-surface-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasModule('crm') && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-primary-500" />
              Conversaciones recientes
            </h3>
            <div className="space-y-3">
              {demoConversations.slice(0, 4).map((conv) => (
                <div key={conv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {conv.contact?.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{conv.contact?.name}</p>
                    <p className="text-xs text-surface-400 truncate">{conv.lastMessage?.content}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Package size={16} className="text-amber-500" />
            Pedidos recientes
          </h3>
          <div className="space-y-3">
            {demoOrders.slice(0, 4).map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  <ShoppingCart size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800">{order.orderNumber}</p>
                  <p className="text-xs text-surface-400">{order.contact?.name} - {formatCurrency(order.total)}</p>
                </div>
                <span className={`text-xs font-medium capitalize ${
                  order.status === 'delivered' ? 'text-emerald-600' :
                  order.status === 'shipped' ? 'text-blue-600' :
                  'text-amber-600'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {hasModule('crm') && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <Bot size={16} className="text-violet-500" />
              Agentes de IA
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                <div>
                  <p className="text-sm font-medium text-surface-800">Asistente de Ventas</p>
                  <p className="text-xs text-surface-400">OpenAI - Todas las conversaciones</p>
                </div>
                <span className="badge-success">Activo</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                <div>
                  <p className="text-sm font-medium text-surface-800">Soporte Post-venta</p>
                  <p className="text-xs text-surface-400">Anthropic - Seleccionadas</p>
                </div>
                <span className="badge-neutral">Inactivo</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
