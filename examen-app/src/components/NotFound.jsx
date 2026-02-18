import React from 'react';
import { Home, ArrowLeft, Search } from 'lucide-react';

/**
 * Página 404 mejorada con mejor UX
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6">
      <div className="text-center max-w-md">
        {/* Ilustración 404 */}
        <div className="relative mb-8">
          <div className="text-[150px] font-black text-gray-100 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <Search className="w-16 h-16 text-primaryBlue mx-auto mb-2" />
              <span className="text-gray-500 text-sm">No encontrado</span>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Página no encontrada
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Lo sentimos, la página que buscas no existe, ha sido movida o no tienes permiso para acceder a ella.
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primaryBlue text-white rounded-xl hover:bg-primaryBlueLight font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Home className="w-5 h-5" />
            Ir al inicio
          </a>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-300 border-2 border-gray-200 hover:border-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver atrás
          </button>
        </div>

        {/* Ayuda */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-sm mb-2">¿Necesitas ayuda?</p>
          <a
            href="mailto:wlaverde5@gmail.com"
            className="text-primaryBlue hover:underline font-medium"
          >
            wlaverde5@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
