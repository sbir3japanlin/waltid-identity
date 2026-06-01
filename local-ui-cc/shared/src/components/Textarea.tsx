import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 text-sm border rounded-input transition-colors resize-y
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-accent/30'}
          outline-none font-mono ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
