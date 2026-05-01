import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value?: string;
    percentage?: number;
  };
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  className = '',
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: 'border-[var(--color-border)]',
    success: 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5',
    warning: 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5',
    danger: 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5',
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />,
    down: <TrendingDown className="w-4 h-4 text-[var(--color-danger)]" />,
    neutral: <Minus className="w-4 h-4 text-[var(--color-text-secondary)]" />,
  };

  const trendColors = {
    up: 'text-[var(--color-success)]',
    down: 'text-[var(--color-danger)]',
    neutral: 'text-[var(--color-text-secondary)]',
  };

  return (
    <div
      className={`p-4 bg-[var(--color-surface)] border rounded-xl ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-surface-elevated)] rounded-lg text-[var(--color-primary)]">
          {icon}
        </div>
        <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
        {trend && (
          <div className="flex items-center gap-1">
            {trendIcons[trend.direction]}
            <span className={`text-sm font-medium ${trendColors[trend.direction]}`}>
              {trend.percentage !== undefined ? `${trend.percentage}%` : trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function StatCardGrid({ children, columns = 2 }: StatCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-3`}>
      {children}
    </div>
  );
}