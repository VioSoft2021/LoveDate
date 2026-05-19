import { useState } from 'react'
import { readChatThreads } from '../persistence'
import type { ChatMessage, DatePlan } from '../domain'

// Phase D1.3 — useChatState
//
// Groups chat-related state into one hook. Handlers (sendChatMessage,
// generateAiCoachSuggestions, generateAiDatePlans, handleAttachmentPick,
// startVoiceRecording) stay in App.tsx for now because each reaches
// into multiple concerns (deck refs, self profile, notifications, etc.)
// that aren't yet extracted. This hook is intentionally a state
// container — once more concerns are extracted, handlers can migrate
// into it without re-architecting the API.

export const useChatState = () => {
  const [chatThreads, setChatThreads] = useState<Record<number, ChatMessage[]>>(() =>
    readChatThreads(),
  )
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [chatAttachmentDraft, setChatAttachmentDraft] =
    useState<ChatMessage['attachment'] | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [showFullChatHistory, setShowFullChatHistory] = useState(false)

  const [aiCoachSuggestions, setAiCoachSuggestions] = useState<string[]>([])
  const [aiCoachLoading, setAiCoachLoading] = useState(false)
  const [aiDatePlans, setAiDatePlans] = useState<DatePlan[]>([])
  const [aiDatePlannerLoading, setAiDatePlannerLoading] = useState(false)

  const [unreadChats, setUnreadChats] = useState<Record<number, number>>({})
  const [matchQueueIds, setMatchQueueIds] = useState<number[]>([])

  return {
    // Thread state
    chatThreads,
    setChatThreads,
    activeChatId,
    setActiveChatId,
    chatDraft,
    setChatDraft,
    chatSearch,
    setChatSearch,
    chatAttachmentDraft,
    setChatAttachmentDraft,
    isRecordingVoice,
    setIsRecordingVoice,
    showFullChatHistory,
    setShowFullChatHistory,
    // AI Coach / Date Planner
    aiCoachSuggestions,
    setAiCoachSuggestions,
    aiCoachLoading,
    setAiCoachLoading,
    aiDatePlans,
    setAiDatePlans,
    aiDatePlannerLoading,
    setAiDatePlannerLoading,
    // Cross-thread bookkeeping
    unreadChats,
    setUnreadChats,
    matchQueueIds,
    setMatchQueueIds,
  } as const
}
