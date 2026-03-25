import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled errors in the component tree and shows a fallback UI
 * instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
          <div className="max-w-md text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">
              {this.state.error?.message ?? 'An unexpected error occurred in the map editor.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors"
              >
                Try again
              </button>
              <a
                href="https://github.com/nicksibicin/strava-gps-editor/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
              >
                Report issue
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
