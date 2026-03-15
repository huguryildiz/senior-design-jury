// src/shared/ErrorBoundary.jsx
// ============================================================
// Top-level error boundary for jury and admin page branches.
// Catches unexpected render errors and shows a recovery UI
// instead of a blank white screen.
// ============================================================

import { Component } from "react";

export default class ErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            gap: "16px",
            padding: "32px",
            textAlign: "center",
            fontFamily: "inherit",
          }}
          role="alert"
        >
          <p style={{ fontSize: "1rem", color: "var(--text-secondary, #6b7280)", margin: 0 }}>
            Something went wrong.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "var(--brand-500, #2F56D6)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9375rem",
              fontWeight: 500,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
