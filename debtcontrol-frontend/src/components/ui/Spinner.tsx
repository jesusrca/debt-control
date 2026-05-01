interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizes[size]} border-[var(--color-primary)] border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    />
  );
}

interface SpinnerOverlayProps {
  message?: string;
}

export function SpinnerOverlay({ message = 'Cargando...' }: SpinnerOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
      </div>
    </div>
  );
}