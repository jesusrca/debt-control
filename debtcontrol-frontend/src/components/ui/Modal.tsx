interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto animate-slide-up ${className}`}
      >
        {title && (
          <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-5 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}