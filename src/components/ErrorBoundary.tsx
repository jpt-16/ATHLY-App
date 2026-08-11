import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a failure in one screen shows a readable message
 * instead of a blank page. The design tool wrapped every prototype in an
 * equivalent boundary; production keeps one for the same reason.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Replace with the app's error reporter once one is wired up.
    console.error('ATHLY crashed while rendering', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '40px 24px',
          background: '#E8E5DE',
          color: '#111815',
          fontFamily: 'Archivo, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.02em' }}>Something went wrong.</div>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 14, lineHeight: 1.5, color: '#6E6A60' }}>
          Reload the page to start over. If it keeps happening, the details are in the browser console.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: '13px 22px',
            borderRadius: 14,
            background: '#17A05E',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
