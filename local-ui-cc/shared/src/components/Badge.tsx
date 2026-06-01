// Badge.tsx
type BadgeVariant = 'mdoc' | 'sd-jwt' | 'jwt-vc' | 'success' | 'error' | 'pending' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  mdoc: 'bg-blue-50 text-blue-600',
  'sd-jwt': 'bg-emerald-50 text-emerald-600',
  'jwt-vc': 'bg-amber-50 text-amber-600',
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-red-50 text-red-600',
  pending: 'bg-slate-100 text-slate-500',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
