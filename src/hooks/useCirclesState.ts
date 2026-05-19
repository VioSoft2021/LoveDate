import { useState } from 'react'
import {
  readCirclePosts,
  readCircleRsvps,
  readJoinedCircles,
} from '../persistence'
import type { CirclePost } from '../domain'

// Phase D1.9 — useCirclesState
//
// Owns the circles feature's local UI state (search, joined IDs,
// posts, post-composer draft, currently-selected circle, RSVP map).
// All five initial values hydrate from localStorage via the existing
// persistence module.

export const useCirclesState = () => {
  const [circleSearch, setCircleSearch] = useState('')
  const [joinedCircleIds, setJoinedCircleIds] = useState<string[]>(() => readJoinedCircles())
  const [circlePosts, setCirclePosts] = useState<CirclePost[]>(() => readCirclePosts())
  const [circlePostDraft, setCirclePostDraft] = useState('')
  const [selectedCircleId, setSelectedCircleId] = useState<string>('design-lounge')
  const [circleRsvps, setCircleRsvps] = useState<Record<string, boolean>>(() =>
    readCircleRsvps(),
  )

  return {
    circleSearch, setCircleSearch,
    joinedCircleIds, setJoinedCircleIds,
    circlePosts, setCirclePosts,
    circlePostDraft, setCirclePostDraft,
    selectedCircleId, setSelectedCircleId,
    circleRsvps, setCircleRsvps,
  } as const
}
