import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SurfaceFallbackBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
  resetKey: string;
}

interface SurfaceFallbackBoundaryState {
  hasError: boolean;
}

export class SurfaceFallbackBoundary extends Component<
  SurfaceFallbackBoundaryProps,
  SurfaceFallbackBoundaryState
> {
  state: SurfaceFallbackBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SurfaceFallbackBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    this.props.onError?.(error);
  }

  componentDidUpdate(previousProps: SurfaceFallbackBoundaryProps): void {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
