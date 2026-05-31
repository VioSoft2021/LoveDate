// src/services/backend/chat.ts — split from backendApi.ts (2026-05-31).
import { supabase, getCurrentUserId } from './client'

export type CloudChatMessage = {
  id: string
  senderId: string
  recipientId: string
  text: string
  attachment: { kind: 'image' | 'video' | 'audio'; url: string; name: string } | null
  createdAt: number
}
type ChatMessageRow = {
  id: string
  sender_id: string
  recipient_id: string
  text: string
  attachment: { kind?: string; url?: string; name?: string } | null
  created_at: string
}
const mapChatMessageRow = (row: ChatMessageRow): CloudChatMessage => {
  let attachment: CloudChatMessage['attachment'] = null
  if (row.attachment && typeof row.attachment === 'object') {
    const kind = row.attachment.kind
    if (kind === 'image' || kind === 'video' || kind === 'audio') {
      attachment = {
        kind,
        url: String(row.attachment.url ?? ''),
        name: String(row.attachment.name ?? ''),
      }
    }
  }
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    text: row.text ?? '',
    attachment,
    createdAt: new Date(row.created_at).getTime(),
  }
}
/**
 * Phase C3 — insert a chat message. RLS rejects the insert unless sender
 * and recipient are matched (both right-swiped each other). Returns the
 * server-confirmed row on success.
 */
export const backendSendChatMessage = async (input: {
  recipientId: string
  text: string
  attachment?: CloudChatMessage['attachment']
}): Promise<CloudChatMessage | null> => {
  if (!supabase) {
    return null
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: userId,
      recipient_id: input.recipientId,
      text: input.text,
      attachment: input.attachment ?? null,
    })
    .select('id, sender_id, recipient_id, text, attachment, created_at')
    .single()

  if (error || !data) {
     
    console.warn('Chat message send failed:', error?.message ?? 'no data')
    return null
  }
  return mapChatMessageRow(data as ChatMessageRow)
}
export type LoadedChatMessage = CloudChatMessage & { sender: 'me' | 'them' }
/**
 * Fetch the full history for a one-on-one thread, ordered oldest-first so
 * the caller can render directly. Each message is annotated with sender
 * direction relative to the current user, sparing callers from needing
 * the current user id.
 */
export const backendLoadChatHistory = async (
  otherUserId: string,
): Promise<LoadedChatMessage[]> => {
  if (!supabase) {
    return []
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, sender_id, recipient_id, text, attachment, created_at')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
    )
    .order('created_at', { ascending: true })
    .limit(500)

  if (error || !Array.isArray(data)) {
     
    console.warn('Chat history load failed:', error?.message ?? 'no data')
    return []
  }
  return data.map((row) => {
    const mapped = mapChatMessageRow(row as ChatMessageRow)
    return { ...mapped, sender: mapped.senderId === userId ? 'me' : 'them' }
  })
}
/**
 * Subscribe to new chat messages addressed to the current user. Returns an
 * unsubscribe function. Caller is responsible for filtering by thread (the
 * subscription fires for every incoming message across all matches).
 */
export const backendSubscribeToInbox = (
  onMessage: (message: CloudChatMessage) => void,
): (() => void) => {
  if (!supabase) {
    return () => {}
  }
  let channel: ReturnType<typeof supabase.channel> | null = null

  void (async () => {
    const userId = await getCurrentUserId()
    if (!userId || !supabase) {
      return
    }
    channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: { new: ChatMessageRow }) => {
          onMessage(mapChatMessageRow(payload.new))
        },
      )
      .subscribe()
  })()

  return () => {
    if (channel && supabase) {
      void supabase.removeChannel(channel)
    }
  }
}
