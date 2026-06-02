import React from 'react'
import type { Toast } from '../domain'

export type ToastStackProps = {
  toasts: Toast[]
}

// Floating toast stack rendered at the app-shell level. Stays alive
// across screen transitions because the parent owns the toast queue
// via useToasts (auto-dismisses after 2.6s). aria-live="polite" so
// assistive tech reads new toasts without interrupting the user.
export const ToastStack: React.FC<ToastStackProps> = ({ toasts }) => {
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <p key={toast.id} className={`toast ${toast.tone}`}>
          {toast.message}
          {toast.action ? (
            <button
              type="button"
              className="toast-action"
              onClick={toast.action.onClick}
              style={{
                marginLeft: 12,
                background: 'transparent',
                border: '1px solid currentColor',
                color: 'inherit',
                borderRadius: 999,
                padding: '2px 10px',
                font: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </p>
      ))}
    </div>
  )
}
