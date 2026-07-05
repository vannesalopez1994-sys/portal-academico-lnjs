import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UI ERROR:', error);
    console.error('Error Info:', errorInfo);
    // Log additional context if available
    if (window.location) {
      console.error('URL at crash:', window.location.href);
    }
  }

  public componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.hasError && !this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }



  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col p-4 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
          <p className="text-gray-600 mb-4 text-sm max-w-md">
            Ha ocurrido un error inesperado al cargar la página. Por favor, intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
