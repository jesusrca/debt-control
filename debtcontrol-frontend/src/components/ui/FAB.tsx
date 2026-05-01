import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Plus } from 'lucide-react';

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ icon, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`fixed bottom-[76px] right-4 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-dc-lg flex items-center justify-center hover:bg-[var(--color-primary-hover)] hover:shadow-glow-md transition-all duration-200 btn-ripple click-scale z-30 md:bottom-6 md:right-6 ${className}`}
        {...props}
      >
        {icon || <Plus className="w-6 h-6" />}
      </button>
    );
  }
);

FAB.displayName = 'FAB';