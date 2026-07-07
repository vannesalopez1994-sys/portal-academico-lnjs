import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  public state: State = {
    hasError: false,
    error: null,
    recovering: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UI ERROR (auto-recovering):', error.message);
    console.error('Error Info:', errorInfo.componentStack?.slice(0, 300));

    // Auto-recover after 1.5 seconds — on mobile the Render backend wakes up
    // and a retry is almost always successful, so we reload silently.
    this.recoveryTimer = setTimeout(() => {
      this.setState({ recovering: true });
      // Give 300ms for the spinner to show, then reset error state
      setTimeout(() => {
        this.setState({ hasError: false, error: null, recovering: false });
      }, 300);
    }, 1500);
  }

  public componentWillUnmount() {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
  }

  public render() {
    if (this.state.hasError) {
      // Show a subtle loading spinner instead of an ugly error screen.
      // The recovery timer will reset the boundary automatically.
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-500 text-sm font-medium">Cargando...</p>
        </div>
      );
    }

    return this.props.children;
  }
}
