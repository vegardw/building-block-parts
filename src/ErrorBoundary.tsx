import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  // Rendered instead of the children after an error. `reset` tries the children again.
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Keeps a failure in one part of the page (the 3D preview) from blanking the whole app.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    console.error("Preview failed:", error);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
