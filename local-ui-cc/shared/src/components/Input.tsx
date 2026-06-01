import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({ label, helperText, error, className = '', ...props }: InputProps) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-sm border rounded-input transition-colors
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-accent/30'}
          outline-none ${className}`}
        {...props}
      />
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
