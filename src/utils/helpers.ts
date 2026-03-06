import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OrderStatus, MessagePlatform } from '@/types';

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ayer';
  return format(date, 'dd/MM/yy');
}

export function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: es });
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    new: 'badge-info',
    confirmed: 'badge-info',
    processing: 'badge-warning',
    packed: 'badge-warning',
    shipped: 'badge-success',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    returned: 'badge-danger',
  };
  return colors[status];
}

export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    new: 'Nuevo',
    confirmed: 'Confirmado',
    processing: 'Procesando',
    packed: 'Empacado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    returned: 'Devuelto',
  };
  return labels[status];
}

export function getPlatformLabel(p: MessagePlatform): string {
  const labels: Record<MessagePlatform, string> = {
    whatsapp: 'WhatsApp',
    messenger: 'Messenger',
    instagram: 'Instagram',
  };
  return labels[p];
}

export function getPlatformColor(p: MessagePlatform): string {
  const colors: Record<MessagePlatform, string> = {
    whatsapp: '#25D366',
    messenger: '#0084FF',
    instagram: '#E4405F',
  };
  return colors[p];
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
