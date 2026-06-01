import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'error' | 'success' | 'info';
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'error') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const bgMap = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export function ToastContainer({ toasts, dismissToast }: {
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2">
      {toasts.map(t => {
        const Icon = iconMap[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-card shadow-toast text-white text-sm max-w-sm
              cursor-pointer animate-slide-in ${bgMap[t.type]}`}
            onClick={() => dismissToast(t.id)}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 break-words">{t.text}</span>
            <X className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70 hover:opacity-100" />
          </div>
        );
      })}
    </div>
  );
}
