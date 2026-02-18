import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, WifiOff, ShieldX, HelpCircle, ServerOff } from 'lucide-react';
import Button from './Button';

/**
 * Tipos de error con configuración visual
 */
const errorTypes = {
  network: {
    icon: WifiOff,
    title: 'Error de conexión',
    description: 'No pudimos conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconBg: 'bg-orange-100',
  },
  notFound: {
    icon: HelpCircle,
    title: 'No encontrado',
    description: 'El recurso que buscas no existe o ha sido eliminado.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
  },
  permission: {
    icon: ShieldX,
    title: 'Acceso denegado',
    description: 'No tienes permisos para acceder a este recurso. Contacta al administrador si crees que es un error.',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
  },
  server: {
    icon: ServerOff,
    title: 'Error del servidor',
    description: 'Hubo un problema con el servidor. Nuestro equipo ha sido notificado y estamos trabajando en ello.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-100',
  },
  generic: {
    icon: AlertTriangle,
    title: 'Algo salió mal',
    description: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
  },
};

/**
 * Componente ErrorState para mostrar errores con acciones de recuperación
 */
export default function ErrorState({
  type = 'generic',
  title,
  description,
  error,
  onRetry,
  onGoBack,
  showDetails = false,
  className = '',
  fullScreen = false,
}) {
  const config = errorTypes[type] || errorTypes.generic;
  const Icon = config.icon;

  const content = (
    <div
      className={`
        ${config.bgColor} ${config.borderColor}
        border-2 rounded-2xl p-8 text-center
        ${className}
      `}
      role="alert"
    >
      <div className={`
        w-16 h-16 mx-auto mb-4 rounded-full
        flex items-center justify-center
        ${config.iconBg}
      `}>
        <Icon className={`w-8 h-8 ${config.color}`} aria-hidden="true" />
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-2">
        {title || config.title}
      </h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {description || config.description}
      </p>

      {showDetails && error && (
        <details className="mb-6 text-left max-w-md mx-auto">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            Ver detalles técnicos
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto text-gray-700 border border-gray-200">
            {typeof error === 'object' ? JSON.stringify(error, null, 2) : error}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reintentar
          </Button>
        )}
        {onGoBack && (
          <Button
            variant="outline"
            onClick={onGoBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Volver
          </Button>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="max-w-lg w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
