import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * Configuración de tipos de toast
 */
const toastTypes = {
  success: {
    icon: CheckCircle,
    className: 'bg-success text-white',
    progressClass: 'bg-white/30',
  },
  error: {
    icon: XCircle,
    className: 'bg-error text-white',
    progressClass: 'bg-white/30',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-500 text-white',
    progressClass: 'bg-white/30',
  },
  info: {
    icon: Info,
    className: 'bg-info text-white',
    progressClass: 'bg-white/30',
  },
  loading: {
    icon: Loader2,
    className: 'bg-gray-800 text-white',
    progressClass: 'bg-white/30',
    iconClass: 'animate-spin',
  },
};

/**
 * Componente Toast individual
 */
function Toast({ id, type, title, message, duration, onClose, showProgress }) {
  const config = toastTypes[type] || toastTypes.info;
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.className}
        relative flex items-start gap-3 p-4 rounded-xl shadow-2xl
        min-w-[320px] max-w-md
        animate-slideIn
        overflow-hidden
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClass || ''}`}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}
      </div>

      {type !== 'loading' && (
        <button
          onClick={() => onClose(id)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Barra de progreso */}
      {showProgress && duration > 0 && type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
          <div
            className={`h-full ${config.progressClass}`}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Provider de Toast
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((options) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      type: 'info',
      duration: 5000,
      showProgress: true,
      ...options,
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss
    if (toast.duration > 0 && toast.type !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateToast = useCallback((id, options) => {
    setToasts(prev => prev.map(t =>
      t.id === id ? { ...t, ...options } : t
    ));
  }, []);

  const toast = {
    success: (title, message, options = {}) =>
      addToast({ type: 'success', title, message, ...options }),

    error: (title, message, options = {}) =>
      addToast({ type: 'error', title, message, duration: 7000, ...options }),

    warning: (title, message, options = {}) =>
      addToast({ type: 'warning', title, message, ...options }),

    info: (title, message, options = {}) =>
      addToast({ type: 'info', title, message, ...options }),

    loading: (title, message, options = {}) =>
      addToast({ type: 'loading', title, message, duration: 0, ...options }),

    dismiss: removeToast,
    update: updateToast,

    promise: async (promise, { loading, success, error }) => {
      const id = addToast({
        type: 'loading',
        title: loading?.title || 'Cargando...',
        message: loading?.message,
        duration: 0,
      });

      try {
        const result = await promise;
        updateToast(id, {
          type: 'success',
          title: success?.title || 'Completado',
          message: success?.message,
          duration: 5000,
        });
        setTimeout(() => removeToast(id), 5000);
        return result;
      } catch (err) {
        updateToast(id, {
          type: 'error',
          title: error?.title || 'Error',
          message: error?.message || err.message,
          duration: 7000,
        });
        setTimeout(() => removeToast(id), 7000);
        throw err;
      }
    },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div
          className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none"
          aria-label="Notificaciones"
        >
          <style>{`
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(100%);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
            .animate-slideIn {
              animation: slideIn 0.3s ease-out;
            }
          `}</style>
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast {...t} onClose={removeToast} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/**
 * Hook para usar el sistema de toast
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
};

export default ToastContext;
