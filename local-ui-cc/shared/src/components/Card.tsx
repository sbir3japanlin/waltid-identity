// Card.tsx
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  children: ReactNode;
}

export function Card({ header, footer, hover = false, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-card shadow-card
        ${hover ? 'cursor-pointer transition-shadow hover:shadow-card-hover' : ''}
        ${className}`}
      {...props}
    >
      {header && (
        <div className="px-5 py-3 border-b border-slate-100 font-medium text-sm text-slate-700">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-card">
          {footer}
        </div>
      )}
    </div>
  );
}
