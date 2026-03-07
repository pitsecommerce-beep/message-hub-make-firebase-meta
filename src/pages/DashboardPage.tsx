import { useState, useEffect } from 'react';
import { MessageSquare, Users, ShoppingCart, TrendingUp, ArrowUpRight, Bot, Package, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getContacts, getConversations, getOrders, getAIAgents, getTeam } from '@/services/firestore';
import { formatCurrency, getOrderStatusLabel } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { Contact, Conversation, Order, AIAgent, Team } from '@/types';

export default function DashboardPage() {
  const { user, hasModule } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.teamId) return;
    const tid = user.teamId;
    Promise.all([
      hasModule('crm') ? getConversations(tid).catch(() => []) : [],
      hasModule('crm') ? getContacts(tid).catch(() => []) : [],
      getOrders(tid).catch(() => []),
      hasModule('crm') ? getAIAgents(tid).catch(() => []) : [],
      getTeam(tid).catch(() => null),
    ]).then(([c, ct, o, a, t]) => {
      setConversations(c as Conversation[]);
      setContacts(ct as Contact[]);
      setOrders(o as Order[]);
      setAgents(a as AIAgent[]);
      setTeam(t as Team | null);
      setLoading(false);
    });
  }, [user?.teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openConvos = conversations.filter(c => c.status === 'open').length;
  const pendingOrders = orders.filter(o => ['new', 'confirmed', 'processing'].includes(o.status)).length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned').reduce((s, o) => s + (o.total || 0), 0);

  const stats = [
    { label: 'Conversaciones abiertas', value: openConvos, icon: <MessageSquare size={20} />, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400', show: hasModule('crm') },
    { label: 'Contactos totales', value: contacts.length, icon: <Users size={20} />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', show: hasModule('crm') },
    { label: 'Pedidos pendientes', value: pendingOrders, icon: <ShoppingCart size={20} />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400', show: true },
    { label: 'Ingresos totales', value: formatCurrency(totalRevenue), icon: <TrendingUp size={20} />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400', show: hasModule('crm') },
  ].filter(s => s.show);

  const handleCopyOrgCode = () => {
    if (team?.orgCode) {
      navigator.clipboard.writeText(team.orgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title={`Bienvenido, ${user?.displayName?.split(' ')[0] || 'Usuario'}`} subtitle="Aqui tienes un resumen de tu actividad" />

      {user?.role === 'manager' && team?.orgCode && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-100 dark:border-primary-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Codigo de organizacion</p>
            <p className="text-xs text-surface-500">Comparte este codigo para que tu equipo se una</p>
          </div>
          <button onClick={handleCopyOrgCode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-surface-800 border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
            <span className="font-mono text-lg font-bold text-primary-700 dark:text-primary-400 tracking-wider">{team.orgCode}</span>
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-surface-400" />}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>{stat.icon}</div>
              <ArrowUpRight size={16} className="text-surface-400" />
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">{stat.value}</p>
            <p className="text-sm text-surface-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasModule('crm') && conversations.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-primary-500" /> Conversaciones recientes
            </h3>
            <div className="space-y-3">
              {conversations.slice(0, 4).map((conv) => (
                <div key={conv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(conv.contact?.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{conv.contact?.name || 'Contacto'}</p>
                    <p className="text-xs text-surface-400 truncate">{conv.lastMessage?.content || 'Sin mensajes'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
              <Package size={16} className="text-amber-500" /> Pedidos recientes
            </h3>
            <div className="space-y-3">
              {orders.slice(0, 4).map((order) => (
                <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{order.orderNumber}</p>
                    <p className="text-xs text-surface-400">{formatCurrency(order.total)}</p>
                  </div>
                  <span className="text-xs font-medium text-surface-500">{getOrderStatusLabel(order.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasModule('crm') && agents.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
              <Bot size={16} className="text-violet-500" /> Agentes de IA
            </h3>
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-700">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{agent.name}</p>
                    <p className="text-xs text-surface-400">{agent.providerId}</p>
                  </div>
                  <span className={agent.isActive ? 'badge-success' : 'badge-neutral'}>{agent.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && orders.length === 0 && (
          <div className="card p-8 text-center col-span-2">
            <MessageSquare size={40} className="mx-auto mb-3 text-surface-300 dark:text-surface-600" />
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Sin datos aun</h3>
            <p className="text-xs text-surface-400">Conecta tus canales de Meta en Configuracion para empezar a recibir mensajes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
