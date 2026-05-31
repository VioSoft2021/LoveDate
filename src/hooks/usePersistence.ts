import { useEffect } from 'react'
import {
  AUTH_STORAGE_KEY,
  CALL_HISTORY_STORAGE_KEY,
  CHAT_THREADS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
} from '../persistence/keys'
import { saveBlockedProfileIds, saveModerationQueue, type SafetyReport } from '../services/moderation'
import type { CallLogEntry, ChatMessage, SwipeHistory } from '../domain'

type UsePersistenceInput = {
  history: SwipeHistory
  isAuthenticated: boolean
  userEmail: string
  chatThreads: Record<number, ChatMessage[]>
  callHistory: CallLogEntry[]
  blockedProfileIds: number[]
  safetyReports: SafetyReport[]
}

// Mirrors local state into localStorage so it survives reloads — pure
// write-on-change effects, extracted verbatim from App.tsx. Each effect keeps
// its original dependency array, so the write cadence is unchanged.
export const usePersistence = ({
  history,
  isAuthenticated,
  userEmail,
  chatThreads,
  callHistory,
  blockedProfileIds,
  safetyReports,
}: UsePersistenceInput) => {
  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ isAuthenticated, email: userEmail }),
    )
  }, [isAuthenticated, userEmail])

  useEffect(() => {
    window.localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(chatThreads))
  }, [chatThreads])

  useEffect(() => {
    window.localStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify(callHistory))
  }, [callHistory])

  useEffect(() => {
    saveBlockedProfileIds(blockedProfileIds)
  }, [blockedProfileIds])

  useEffect(() => {
    saveModerationQueue(safetyReports)
  }, [safetyReports])
}
