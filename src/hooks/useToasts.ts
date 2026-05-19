import { useCallback, useState } from 'react'
import type { NotificationItem, Toast } from '../domain'

// Phase D1.6 — useToasts
//
// Owns transient toasts (auto-dismiss after 2.6s) and the persistent
// notification feed. Self-contained: no external dependencies, pure
// state + handlers. Every other hook (useAuth, useChatState, etc.)
// receives pushToast as a callback prop from this hook's return value.

export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const pushToast = useCallback(
    (message: string, tone: Toast['tone'] = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, 2600)
    },
    [],
  )

  const pushNotification = useCallback(
    (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
      const next: NotificationItem = {
        ...item,
        id: Date.now() + Math.floor(Math.random() * 1000),
        createdAt: Date.now(),
        read: false,
      }
      setNotifications((current) => [next, ...current].slice(0, 30))
    },
    [],
  )

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

  return {
    toasts,
    setToasts,
    notifications,
    setNotifications,
    pushToast,
    pushNotification,
    markAllNotificationsRead,
  } as const
}
