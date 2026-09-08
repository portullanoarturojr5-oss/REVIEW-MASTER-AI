import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Robust React Error Boundary that catches runtime errors in child components
 * and prevents the entire application from crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isIteratorError =
        this.state.error?.message?.includes("Iterator") ||
        this.state.error?.name === "ReferenceError";

      return (
        <div
          id="error-boundary-screen"
          className="min-h-[300px] w-full flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {this.props.fallbackTitle || "Something went wrong"}
            </h2>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {isIteratorError
                ? "A browser compatibility exception was intercepted. The application has isolated the error safely."
                : this.props.fallbackMessage ||
                  "An unexpected error occurred in this view. Your saved notes, folders, and flashcards remain safe in storage."}
            </p>

            {this.state.error?.message && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 mb-6 text-left overflow-hidden">
                <p className="text-xs font-mono text-rose-400 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="error-boundary-reset-btn"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700/50"
              >
                <Home className="w-4 h-4" />
                Return to View
              </button>

              <button
                id="error-boundary-reload-btn"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
