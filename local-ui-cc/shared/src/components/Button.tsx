// Button.tsx
import { Spinner } from './Spinner';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/50',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-300',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent/50',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-btn',
  md: 'px-4 py-2 text-sm rounded-btn',
  lg: 'px-6 py-2.5 text-base rounded-btn',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
