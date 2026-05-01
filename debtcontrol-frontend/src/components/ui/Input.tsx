import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full h-12 px-4 bg-[var(--color-surface)] border rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-primary)]/50 transition-all duration-200 focus:outline-none ${
            hasError
              ? 'border-2 border-[var(--color-danger)] bg-[var(--color-danger-muted)]'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_20px_rgba(0,212,255,0.2)]'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';