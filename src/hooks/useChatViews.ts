import { useMemo } from 'react'
import { formatShortTime } from '../utils/format'
import type { ChatMessage, ChemistryInsights } from '../domain'
import type { Profile } from '../services/priveApi'

// Cap rendered messages per thread — older ones load on demand. Lives here
// because only these chat-view derivations reference it.
const CHAT_RENDER_WINDOW = 120

export type ChatPreview = {
  profile: Profile
  lastText: string
  lastTime: string
  unread: number
}

type UseChatViewsInput = {
  matchedProfiles: Profile[]
  chatThreads: Record<number, ChatMessage[]>
  unreadChats: Record<number, number>
  chatSearch: string
  selectedChatProfile: Profile | null
  showFullChatHistory: boolean
  getChemistryInsights: (profile: Profile) => ChemistryInsights
}

// Pure derivations for the Chats screen (preview list + the open conversation),
// extracted from App.tsx. No state, no effects — just memoized selectors over
// chat state, so it's safe to read anywhere the inputs are available.
export const useChatViews = ({
  matchedProfiles,
  chatThreads,
  unreadChats,
  chatSearch,
  selectedChatProfile,
  showFullChatHistory,
  getChemistryInsights,
}: UseChatViewsInput) => {
  const chatPreviews = useMemo<ChatPreview[]>(() => {
    return matchedProfiles.map((profile) => {
      const messages = chatThreads[profile.id] ?? []
      const last = messages[messages.length - 1]
      return {
        profile,
        lastText: last?.text ?? '',
        lastTime: last ? formatShortTime(last.createdAt) : '',
        unread: unreadChats[profile.id] ?? 0,
      }
    })
  }, [matchedProfiles, chatThreads, unreadChats])

  const filteredChatPreviews = useMemo(() => {
    const query = chatSearch.trim().toLowerCase()
    if (query.length === 0) {
      return chatPreviews
    }

    return chatPreviews.filter(({ profile, lastText }) => {
      return (
        profile.name.toLowerCase().includes(query) ||
        lastText.toLowerCase().includes(query)
      )
    })
  }, [chatPreviews, chatSearch])

  const selectedChatMessages = useMemo(() => {
    if (!selectedChatProfile) {
      return []
    }
    const messages = chatThreads[selectedChatProfile.id] ?? []
    return showFullChatHistory ? messages : messages.slice(-CHAT_RENDER_WINDOW)
  }, [selectedChatProfile, chatThreads, showFullChatHistory])

  const hiddenChatMessageCount = useMemo(() => {
    if (!selectedChatProfile || showFullChatHistory) {
      return 0
    }
    const messages = chatThreads[selectedChatProfile.id] ?? []
    return Math.max(0, messages.length - CHAT_RENDER_WINDOW)
  }, [selectedChatProfile, chatThreads, showFullChatHistory])

  const selectedChatChemistry = useMemo(
    () => (selectedChatProfile ? getChemistryInsights(selectedChatProfile) : null),
    [selectedChatProfile, getChemistryInsights],
  )

  return {
    chatPreviews,
    filteredChatPreviews,
    selectedChatMessages,
    hiddenChatMessageCount,
    selectedChatChemistry,
  }
}
