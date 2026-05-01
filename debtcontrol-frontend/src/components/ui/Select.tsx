import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {label}
        </label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full h-12 px-4 bg-[var(--color-surface)] border rounded-lg text-sm text-left flex items-center justify-between transition-all duration-200 focus:outline-none focus:border-[var(--color-primary)] ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-[var(--color-border)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
          } ${isOpen ? 'border-[var(--color-primary)]' : ''}`}
        >
          <span className={selectedOption ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden animate-scale-in">
            <div className="max-h-60 overflow-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors ${
                    option.value === value ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {option.label}
                  {option.value === value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}