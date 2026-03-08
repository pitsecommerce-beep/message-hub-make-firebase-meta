import { useState, useEffect } from 'react';
import { MessageSquare, Users, ShoppingCart, TrendingUp, ArrowUpRight, Bot, Package, Copy, Check, DollarSign, Clock, BarChart3, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getContacts, getConversations, getOrders, getAIAgents, getTeam, getTeamUsers } from '@/services/firestore';
import { formatCurrency, getOrderStatusLabel } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { Contact, Conversation, Order, AIAgent, Team, AppUser, Message } from '@/types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

export default function DashboardPage() {
  const { user, hasModule } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
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
      getTeamUsers(tid).catch(() => []),
      // Get all messages for response time calculation
      hasModule('crm') ? getDocs(collection(db, 'teams', tid, 'messages')).then(snap =>
        snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message)
      ).catch(() => []) : [],
    ]).then(([c, ct, o, a, t, tu, msgs]) => {
      setConversations(c as Conversation[]);
      setContacts(ct as Contact[]);
      setOrders(o as Order[]);
      setAgents(a as AIAgent[]);
      setTeam(t as Team | null);
      setTeamUsers(tu as AppUser[]);
      setAllMessages(msgs as Message[]);
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
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned').reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned').length;

  // Calculate average response time per agent
  const calculateAgentResponseTimes = () => {
    const agentStats: Record<string, { totalMs: number; count: number; name: string }> = {};

    // Group messages by conversation
    const msgsByConvo: Record<string, Message[]> = {};
    allMessages.forEach(msg => {
      if (!msgsByConvo[msg.conversationId]) msgsByConvo[msg.conversationId] = [];
      msgsByConvo[msg.conversationId].push(msg);
    });

    // For each conversation, find inbound→outbound pairs to calculate response time
    Object.values(msgsByConvo).forEach(msgs => {
      const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].direction === 'inbound' && sorted[i + 1].direction === 'outbound') {
          const responseTime = new Date(sorted[i + 1].createdAt).getTime() - new Date(sorted[i].createdAt).getTime();
          if (responseTime > 0 && responseTime < 24 * 60 * 60 * 1000) { // Max 24h
            const agentId = sorted[i + 1].sentBy || 'unknown';
            const agentUser = teamUsers.find(u => u.uid === agentId);
            const agentName = sorted[i + 1].isAiGenerated ? 'IA' : (agentUser?.displayName || 'Desconocido');

            if (!agentStats[agentId]) agentStats[agentId] = { totalMs: 0, count: 0, name: agentName };
            agentStats[agentId].totalMs += responseTime;
            agentStats[agentId].count++;
          }
        }
      }
    });

    return Object.entries(agentStats).map(([id, stats]) => ({
      id,
      name: stats.name,
      avgMs: stats.count > 0 ? stats.totalMs / stats.count : 0,
      responses: stats.count,
    })).sort((a, b) => a.avgMs - b.avgMs);
  };

  const agentResponseTimes = calculateAgentResponseTimes();

  const formatResponseTime = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const overallAvgResponseTime = agentResponseTimes.length > 0
    ? agentResponseTimes.reduce((sum, a) => sum + a.avgMs, 0) / agentResponseTimes.length
    : 0;

  // Monthly revenue (current month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyRevenue = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'returned' && o.createdAt >= monthStart)
    .reduce((s, o) => s + (o.total || 0), 0);
  const monthlyOrderCount = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'returned' && o.createdAt >= monthStart).length;

  // Average ticket
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const stats = [
    { label: 'Ingresos del mes', value: formatCurrency(monthlyRevenue), icon: <DollarSign size={20} />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', show: true },
    { label: 'Pedidos del mes', value: monthlyOrderCount, icon: <ShoppingCart size={20} />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400', show: true },
    { label: 'Ingresos totales', value: formatCurrency(totalRevenue), icon: <TrendingUp size={20} />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400', show: true },
    { label: 'Ticket promedio', value: formatCurrency(avgTicket), icon: <BarChart3 size={20} />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', show: totalOrders > 0 },
    { label: 'Conversaciones abiertas', value: openConvos, icon: <MessageSquare size={20} />, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400', show: hasModule('crm') },
    { label: 'Contactos totales', value: contacts.length, icon: <Users size={20} />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400', show: hasModule('crm') },
    { label: 'Pedidos pendientes', value: pendingOrders, icon: <Package size={20} />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400', show: true },
    { label: 'Tiempo promedio respuesta', value: overallAvgResponseTime > 0 ? formatResponseTime(overallAvgResponseTime) : 'N/A', icon: <Clock size={20} />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400', show: hasModule('crm') },
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
      <PageHeader title={`Bienvenido, ${user?.displayName?.split(' ')[0] || 'Usuario'}`} subtitle="Aquí tienes un resumen de tu actividad" />

      {user?.role === 'manager' && team?.orgCode && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-100 dark:border-primary-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Código de organización</p>
            <p className="text-xs text-surface-500">Comparte este código para que tu equipo se una</p>
          </div>
          <button onClick={handleCopyOrgCode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-surface-800 border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
            <span className="font-mono text-lg font-bold text-primary-700 dark:text-primary-400 tracking-wider">{team.orgCode}</span>
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-surface-400" />}
          </button>
        </div>
      )}

      {/* KPI Cards */}
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
        {/* Response Time per Agent */}
        {hasModule('crm') && agentResponseTimes.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-rose-500" /> Tiempo promedio de respuesta por agente
            </h3>
            <div className="space-y-3">
              {agentResponseTimes.map(agent => {
                const maxMs = Math.max(...agentResponseTimes.map(a => a.avgMs));
                const pct = maxMs > 0 ? (agent.avgMs / maxMs) * 100 : 0;
                return (
                  <div key={agent.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-surface-700 dark:text-surface-300">{agent.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-surface-400">{agent.responses} respuestas</span>
                        <span className="font-semibold text-surface-800 dark:text-surface-200">{formatResponseTime(agent.avgMs)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-100 dark:bg-surface-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-rose-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent conversations */}
        {hasModule('crm') && conversations.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-primary-500" /> Conversaciones recientes
            </h3>
            <div className="space-y-3">
              {conversations.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(conv.contact?.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{conv.contact?.name || 'Contacto'}</p>
                    <p className="text-xs text-surface-400 truncate">
                      {conv.aiEnabled && <Bot size={10} className="inline mr-1 text-violet-500" />}
                      {conv.lastMessage?.content || 'Sin mensajes'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        {orders.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
              <Package size={16} className="text-amber-500" /> Pedidos recientes
            </h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
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

        {/* AI Agents */}
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
                    <p className="text-xs text-surface-400">{agent.attendOutsideBusinessHours ? 'Atiende fuera de horario' : 'Solo horario comercial'}</p>
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
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Sin datos aún</h3>
            <p className="text-xs text-surface-400">Conecta tus canales de Meta en Configuración para empezar a recibir mensajes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
