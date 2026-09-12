import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-background text-foreground p-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            An unexpected error occurred in the application. You can try refreshing the page or going back to the dashboard.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 bg-accent hover:bg-accent/80 text-foreground px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Page</span>
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          </div>
          {this.state.error && (
            <div className="mt-8 p-4 bg-card border border-border rounded-lg max-w-2xl w-full overflow-auto text-left">
              <pre className="text-sm text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
