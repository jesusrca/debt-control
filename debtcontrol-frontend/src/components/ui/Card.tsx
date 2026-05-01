import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', variant = 'default', padding = 'md' }: CardProps) {
  const baseStyles = 'rounded-xl border transition-all duration-200';

  const variants = {
    default: 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
    elevated: 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover-lift',
    glow: 'bg-[var(--color-surface)] border-2 border-[var(--color-primary)] hover-glow',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`flex justify-between items-start mb-3 ${className}`}>{children}</div>;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}