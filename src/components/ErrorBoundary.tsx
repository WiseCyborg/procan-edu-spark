import React, { Component, ErrorInfo, ReactNode } from 'react';
import { monitoring } from '@/lib/monitoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, BookOpen } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Helper to determine the dashboard route
// NOTE: Intentionally does NOT use localStorage for role-based routing.
// Using client-side storage for access decisions is a security vulnerability.
// The dashboard route uses a safe default; actual routing is handled by auth flow.
const getDashboardRoute = (): string => {
  return '/dashboard';
};

// Helper to get resume course route - uses localStorage as fallback since ErrorBoundary
// is a class component and cannot use hooks. The actual resume uses server state.
const getResumeRoute = (): string => {
  // ErrorBoundary can't use hooks, so we go to the course layout
  // which will properly route to the resume target
  return '/course';
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to monitoring system
    monitoring.logError('React Error Boundary', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    monitoring.trackUserAction('Error Boundary Retry');
  };

  handleNavigateToDashboard = () => {
    monitoring.trackUserAction('Error Boundary Navigate Dashboard');
    window.location.href = getDashboardRoute();
  };

  handleResumeCourse = () => {
    monitoring.trackUserAction('Error Boundary Resume Course');
    window.location.href = getResumeRoute();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                We're sorry for the inconvenience. An unexpected error occurred.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="bg-muted p-3 rounded text-xs">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Primary recovery actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={this.handleNavigateToDashboard}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button 
                  onClick={this.handleResumeCourse}
                  variant="outline"
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Resume Course
                </Button>
              </div>

              {/* Secondary actions */}
              <div className="flex gap-2 justify-center pt-2 border-t">
                <Button 
                  onClick={this.handleRetry}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  size="sm"
                >
                  Reload Page
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}