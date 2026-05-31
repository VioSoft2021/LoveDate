import { useMemo } from 'react'
import type { SwipeHistory } from '../domain'
import type { Profile } from '../services/priveApi'

// Resolve a list of profile ids to profiles (newest first), dropping any that
// are no longer in the deck. Shared by the liked + passed Activity lists.
const profilesFromIds = (ids: number[], profileById: Map<number, Profile>): Profile[] =>
  ids
    .map((id) => profileById.get(id))
    .filter((profile): profile is Profile => Boolean(profile))
    .reverse()

// Activity-screen history views, extracted from App.tsx (the liked/passed lists
// ran identical map→filter→reverse logic; now deduplicated).
export const useActivityProfiles = (history: SwipeHistory, profileById: Map<number, Profile>) => {
  const likedProfiles = useMemo(
    () => profilesFromIds(history.likedIds, profileById),
    [history.likedIds, profileById],
  )
  const passedProfiles = useMemo(
    () => profilesFromIds(history.passedIds, profileById),
    [history.passedIds, profileById],
  )
  return { likedProfiles, passedProfiles }
}
