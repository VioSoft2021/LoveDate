import type { ChatMessage } from '../domain'
import { CHAT_THREADS_STORAGE_KEY } from './keys'

export const readChatThreads = (): Record<number, ChatMessage[]> => {
  try {
    const raw = window.localStorage.getItem(CHAT_THREADS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>
    const next: Record<number, ChatMessage[]> = {}

    for (const [key, thread] of Object.entries(parsed)) {
      const numericId = Number(key)
      if (!Number.isInteger(numericId) || !Array.isArray(thread)) {
        continue
      }

      next[numericId] = thread
        .filter((message) => message && typeof message === 'object')
        .map((message, index) => ({
          id: Number.isFinite(message.id) ? Number(message.id) : Date.now() + index,
          sender: message.sender === 'them' ? 'them' : 'me',
          text: typeof message.text === 'string' ? message.text : '',
          createdAt: Number.isFinite(message.createdAt) ? Number(message.createdAt) : Date.now(),
          attachment:
            message.attachment &&
            typeof message.attachment.url === 'string' &&
            !message.attachment.url.startsWith('blob:')
              ? {
                  kind: message.attachment.kind,
                  url: message.attachment.url,
                  name: message.attachment.name,
                }
              : undefined,
          status:
            message.status === 'sending' || message.status === 'sent' || message.status === 'read'
              ? message.status
              : undefined,
        }))
    }

    return next
  } catch {
    return {}
  }
}
