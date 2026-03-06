import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center text-surface-400 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-surface-700 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
