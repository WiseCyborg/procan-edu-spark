import React, { Component, ErrorInfo, ReactNode } from 'react';
import { monitoring } from '@/lib/monitoring';
import { RecoveryScreen } from '@/components/recovery/RecoveryScreen';

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

/**
 * ErrorBoundary - Catches React errors and displays a branded recovery screen.
 * 
 * Key improvements:
 * - Uses ProCann branded RecoveryScreen instead of generic error message
 * - Provides session-aware navigation options
 * - Logs errors with support codes for debugging
 * - Prevents cascading failures by not relying on localStorage for routing
 */
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

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use the branded RecoveryScreen
      return (
        <RecoveryScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
