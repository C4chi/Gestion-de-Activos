import React from 'react';

/**
 * ErrorBoundary genérico para capturar errores de React
 * Previene que toda la app se rompa por un error en un componente
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Aquí podrías enviar el error a un servicio de logging
    // como Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI personalizado
      const { fallback, section = 'esta sección' } = this.props;

      if (fallback) {
        return fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="flex items-center justify-center h-full min-h-[400px] bg-red-50 rounded-xl border-2 border-red-200 p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <span className="text-6xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-3">
              Oops! Algo salió mal
            </h2>
            <p className="text-red-600 mb-6">
              Ocurrió un error en {section}. No te preocupes, el resto de la aplicación sigue funcionando.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left bg-white p-4 rounded border border-red-300">
                <summary className="cursor-pointer font-semibold text-red-700 mb-2">
                  Detalles del error (solo visible en desarrollo)
                </summary>
                <pre className="text-xs text-gray-700 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
              >
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorBoundary específico para secciones críticas
 */
export const CriticalErrorBoundary = ({ children, section }) => (
  <ErrorBoundary
    section={section}
    fallback={(error, reset) => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <span className="text-6xl mb-4 inline-block">🚨</span>
            <h2 className="text-2xl font-bold text-red-800 mb-3">
              Error Crítico
            </h2>
            <p className="text-gray-700 mb-6">
              Ocurrió un error crítico en {section}. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
