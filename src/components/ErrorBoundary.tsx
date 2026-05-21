import { Component, type ErrorInfo, type ReactNode } from 'react'
import { backendLogClientError } from '../services/backendApi'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    if (typeof window !== 'undefined') {
      console.error('[LoveDate] Render error:', error, errorInfo)
    }
    // Fire-and-forget cloud log. backendLogClientError swallows any
    // throw so the already-broken UI never compounds.
    backendLogClientError({
      severity: 'react-render',
      message: error.message || String(error),
      stack: error.stack ?? null,
      componentStack: errorInfo.componentStack ?? null,
    })
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleReset = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.clear()
      } catch {
        // ignore — storage unavailable
      }
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem 1.5rem',
          background:
            'linear-gradient(180deg, #050818 0%, #0a0e27 50%, #050818 100%)',
          color: '#ebf4ff',
          fontFamily: "'Trebuchet MS', sans-serif",
          textAlign: 'center',
          gap: '1.25rem',
        }}
      >
        <div style={{ fontSize: '3rem' }}>💔</div>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#d8b86d' }}>
          Something went wrong
        </h1>
        <p style={{ margin: 0, opacity: 0.85, maxWidth: '32rem', lineHeight: 1.5 }}>
          LoveDate ran into an unexpected error. You can try reloading, or reset
          local data if the problem keeps happening.
        </p>
        <pre
          style={{
            margin: '0.5rem 0',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.6rem',
            fontSize: '0.75rem',
            maxWidth: '32rem',
            maxHeight: '8rem',
            overflow: 'auto',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
          }}
        >
          {this.state.error.message}
        </pre>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: '0.6rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)',
              color: '#ebf4ff',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: '#c8408a',
              color: '#fff',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Reset local data
          </button>
        </div>
      </div>
    )
  }
}
