import React from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { logger } from '../utils/logger';

/**
 * Error Boundary global para capturar errores de React
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log del error
    logger.error('Error Boundary capturó un error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Icono */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>

            {/* Título */}
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              Algo salió mal
            </h1>

            {/* Mensaje */}
            <p className="text-gray-600 mb-6">
              Ha ocurrido un error inesperado en la aplicación.
              Por favor, intenta recargar la página.
            </p>

            {/* Detalles del error (solo en desarrollo) */}
            {isDev && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 mb-2">
                  Ver detalles técnicos
                </summary>
                <div className="p-4 bg-gray-100 rounded-lg overflow-auto max-h-48">
                  <p className="text-sm font-mono text-red-600 break-all mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primaryBlue text-white rounded-xl hover:bg-primaryBlueLight transition-all font-semibold shadow-md hover:shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Recargar página
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all font-semibold"
              >
                <Home className="w-5 h-5" />
                Ir al inicio
              </button>
            </div>

            {/* Contacto */}
            <div className="border-t pt-6">
              <p className="text-sm text-gray-500 mb-2">¿El problema persiste?</p>
              <a
                href="mailto:wlaverde5@gmail.com"
                className="inline-flex items-center gap-2 text-primaryBlue hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                Contactar soporte
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
