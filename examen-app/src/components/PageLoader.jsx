import React from 'react';

/**
 * Componente de carga global para Suspense
 * Se muestra mientras se cargan los componentes lazy
 */
export default function PageLoader({ message = 'Cargando...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <div className="text-center">
        {/* Logo animado */}
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primaryBlue to-blue-600 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-3xl font-bold text-white">PI</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-accentYellow rounded-lg flex items-center justify-center shadow-md animate-bounce">
            <span className="text-xs font-bold text-primaryBlue">ICS</span>
          </div>
        </div>

        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primaryBlue rounded-full border-t-transparent animate-spin"></div>
        </div>

        {/* Mensaje */}
        <p className="text-gray-600 text-lg font-medium">{message}</p>
        <p className="text-gray-400 text-sm mt-2">Plataforma Educativa de Excelencia</p>
      </div>
    </div>
  );
}
