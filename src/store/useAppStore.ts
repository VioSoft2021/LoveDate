import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Phase D2 — Zustand store foundation
//
// The 9 existing custom hooks (useAuth, useDeck, useChatState, etc.)
// own domain-grouped state today and continue to work as-is. This
// store is the place where CROSS-CUTTING actions will live —
// handlers that legitimately span multiple domains and currently
// sit inline in App.tsx (sendChatMessage, swipeCard, finalizeSwipe,
// undoSwipe, submitProfileReport, etc.).
//
// Migration plan: each cross-cutting handler moves from App.tsx into
// a slice below. The handler signature stays the same so consumers
// don't change. Once a handler lives in the store, it can `get()`
// state from any slice without prop drilling, which is the actual
// payoff that makes Zustand worthwhile here over plain hooks.
//
// Phase D2.1 will migrate the first handler. This file currently
// defines the empty shell + dev tooling so subsequent migrations
// only add slices, never touch infrastructure.

// Slice signatures will be added as handlers migrate. Empty for now.
type AppStore = {
  // Reserved for future cross-cutting actions. See doc-comment above.
  _placeholder?: never
}

export const useAppStore = create<AppStore>()(
  devtools(() => ({}), {
    name: 'lovedate',
    enabled: import.meta.env.DEV,
  }),
)
