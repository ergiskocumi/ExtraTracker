/**
 * 🛡️ ERROR BOUNDARY - Gestione errori React con fallback UI
 *
 * 🎓 PRINCIPIO: Graceful Degradation
 * Cattura errori JavaScript in qualsiasi punto dell'albero dei componenti figli,
 * prevenendo il crash dell'intera applicazione e mostrando un'interfaccia di fallback.
 *
 * 🎓 PRINCIPIO: Error Isolation
 * Isola gli errori per componente, permettendo al resto dell'app di continuare a funzionare.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../../lib/utils';

export interface ErrorBoundaryProps {
  /** Componenti figli da proteggere */
  children: ReactNode;
  /** Componente fallback personalizzato */
  fallback?: ReactNode;
  /** Callback chiamata quando viene catturato un errore */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Se true, mostra il fallback anche per errori di recupero */
  showFallbackOnReset?: boolean;
  /** Classi CSS aggiuntive per il fallback di default */
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Fallback UI di default quando viene catturato un errore
 */
const DefaultFallback: React.FC<{
  error: Error | null;
  onReset: () => void;
  className?: string;
}> = ({ error, onReset, className }) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      className={cn(
        'min-h-[50vh] flex items-center justify-center p-4',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full text-center">
        {/* Icona errore */}
        <div
          className={cn(
            'w-20 h-20 mx-auto mb-6 rounded-2xl',
            'bg-rose-500/10 border border-rose-500/20',
            'flex items-center justify-center'
          )}
          aria-hidden="true"
        >
          <AlertTriangle className="w-10 h-10 text-rose-400" />
        </div>

        {/* Titolo */}
        <h2 className="text-xl font-bold text-theme-primary mb-2">
          Qualcosa è andato storto
        </h2>

        {/* Messaggio errore */}
        <p className="text-theme-secondary mb-2">
          Si è verificato un errore imprevisto. Riprova o torna alla home.
        </p>

        {/* Dettagli errore (solo in development) */}
        {import.meta.env.DEV && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-theme-muted hover:text-theme-secondary mb-2">
              Dettagli errore (development only)
            </summary>
            <pre className="p-3 rounded-lg bg-theme-surface border border-theme-default text-xs text-rose-400 overflow-auto max-h-40">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}

        {/* Azioni */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={onReset}
            variant="primary"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Riprova
          </Button>
          <Button
            onClick={handleReload}
            variant="outline"
            className="gap-2"
          >
            Ricarica pagina
          </Button>
          <Button
            onClick={handleGoHome}
            variant="ghost"
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Error Boundary Component
 *
 * @example
 * // Uso base
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // Con fallback personalizzato
 * <ErrorBoundary fallback={<MyCustomError />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // Con callback di errore
 * <ErrorBoundary onError={(error, info) => logError(error, info)}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Aggiorna lo stato per mostrare il fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log dell'errore
    console.error('🛡️ ErrorBoundary caught an error:', error, errorInfo);

    // Aggiorna lo stato con i dettagli dell'errore
    this.setState({
      error,
      errorInfo,
    });

    // Chiama il callback onError se fornito
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Qui potresti inviare l'errore a un servizio di logging come Sentry
    // if (import.meta.env.PROD) {
    //   sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, className } = this.props;

    if (hasError) {
      // Se è stato fornito un fallback personalizzato, usalo
      if (fallback) {
        return fallback;
      }

      // Altrimenti usa il fallback di default
      return (
        <DefaultFallback
          error={error}
          onReset={this.handleReset}
          className={className}
        />
      );
    }

    // Nessun errore, renderizza i figli normalmente
    return children;
  }
}

/**
 * Hook per catturare errori in componenti funzionali
 * (Wrapper intorno a ErrorBoundary per uso con hook)
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> => {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  const displayName = Component.displayName || Component.name || 'Component';
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundary;
};

export default ErrorBoundary;
