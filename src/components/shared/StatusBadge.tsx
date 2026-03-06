import { getOrderStatusColor, getOrderStatusLabel } from '@/utils/helpers';
import type { OrderStatus } from '@/types';

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={getOrderStatusColor(status)}>
      {getOrderStatusLabel(status)}
    </span>
  );
}
