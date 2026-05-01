import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, title, children, className = '' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      <div
        ref={sheetRef}
        className={`relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto animate-slide-up ${className}`}
      >
        <div className="sticky top-0 bg-[var(--color-surface)] z-10 px-5 pt-4 pb-2">
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3" />
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>
          )}
        </div>
        <div className="p-5 pt-2">{children}</div>
      </div>
    </div>
  );
}