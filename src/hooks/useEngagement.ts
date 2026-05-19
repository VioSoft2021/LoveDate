import { useCallback, useEffect, useState } from 'react'
import { getLikeUsage, getSuperLikeUsage } from '../services/engagementLimits'
import { getActivePlan } from '../services/planGate'
import type { PlanTier } from '../spec/lovedateConfig'

type EngagementUsage = ReturnType<typeof getLikeUsage>

// Phase D1.7 — useEngagement
//
// Owns the engagement-limit counters (likes-left, super-likes-left)
// and the active plan tier. Boosts/rewinds also live here as discrete
// counters; the actions that consume them stay in App.tsx for now
// (they touch the deck index and the toast surface).

export const useEngagement = () => {
  const [activePlan, setActivePlanState] = useState<PlanTier>(() => getActivePlan())
  const [likeUsage, setLikeUsage] = useState<EngagementUsage>(() => getLikeUsage(activePlan))
  const [superLikeUsage, setSuperLikeUsage] = useState<EngagementUsage>(() =>
    getSuperLikeUsage(activePlan),
  )
  const [boostsLeft, setBoostsLeft] = useState(3)
  const [rewindsLeft, setRewindsLeft] = useState(5)

  // Recompute usage counters from service whenever a swipe lands or
  // the plan tier changes. Called explicitly from swipeCard etc.
  const refreshEngagementUsage = useCallback((plan: PlanTier) => {
    setLikeUsage(getLikeUsage(plan))
    setSuperLikeUsage(getSuperLikeUsage(plan))
  }, [])

  useEffect(() => {
    refreshEngagementUsage(activePlan)
  }, [activePlan, refreshEngagementUsage])

  return {
    activePlan,
    setActivePlan: setActivePlanState,
    likeUsage,
    superLikeUsage,
    setLikeUsage,
    setSuperLikeUsage,
    refreshEngagementUsage,
    boostsLeft,
    setBoostsLeft,
    rewindsLeft,
    setRewindsLeft,
  } as const
}
