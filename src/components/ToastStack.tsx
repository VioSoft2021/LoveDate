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
        </p>
      ))}
    </div>
  )
}
