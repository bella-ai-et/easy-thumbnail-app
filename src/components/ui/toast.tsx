import React, { createContext, useContext, useState, useEffect } from 'react';
import { X } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string | React.ReactNode;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string | React.ReactNode, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string | React.ReactNode, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  removeToast: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, removeToast }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, removeToast]);

  const getToastClasses = () => {
    const baseClasses = "p-4 rounded-lg shadow-md flex items-center justify-between max-w-md animate-in slide-in-from-right-5 duration-300";
    
    switch (toast.type) {
      case 'success':
        return `${baseClasses} bg-green-50 text-green-800 border border-green-200`;
      case 'error':
        return `${baseClasses} bg-red-50 text-red-800 border border-red-200`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 text-yellow-800 border border-yellow-200`;
      default:
        return `${baseClasses} bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20`;
    }
  };

  return (
    <div className={getToastClasses()}>
      <div className="text-sm font-medium pr-6">{toast.message}</div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 rounded-full hover:bg-black/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
