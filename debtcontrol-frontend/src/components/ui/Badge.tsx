interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
    success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger-muted)] text-[var(--color-danger)]',
    primary: 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}