interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  variant = 'default',
  className = '',
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    default: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-2">
          {label && <span className="text-sm text-[var(--color-text-primary)] font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colors[variant]} ${animated && percentage < 100 ? 'progress-stripe' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}