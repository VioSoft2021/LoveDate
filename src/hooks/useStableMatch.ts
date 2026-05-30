// useStableMatch (2026-05-30) — runs Gale-Shapley over the current
// active pool and returns the user's stable partner.
//
// This is the SECOND lens Privé surfaces alongside the AI compatibility
// score. The two answer different questions:
//   - AI compatibility:  "how compatible are you two on personality?"
//   - Gale-Shapley:      "given the full pool right now, is this a stable
//                        pair, or would one of you defect to someone better?"
//
// Stability is a *pool-level* property, not a per-pair one. Even with the
// same compatibility scoring, the G-S verdict can disagree with the
// top-scoring candidate — because the top-scoring candidate for you may
// have a better stable match elsewhere in the pool.
//
// v1 limitations:
//   - Bipartite split is by gender (Man / Woman). Non-binary self gets
//     `unsupported-gender` for now; richer orientation modeling is a v2.
//   - Self always proposes — so self gets the *proposer-optimal* stable
//     match (the best stable partner achievable). The receiving side gets
//     proposer-pessimal — fine because every other user, in their own
//     session, sees the result of *them* proposing, so the asymmetry is
//     symmetric across the userbase.

import { useMemo } from 'react'

import type { Profile } from '../services/priveApi'
import type { SelfProfile } from '../domain/profile'
import type {
  AttachmentStyle,
  BigFiveScores,
} from '../services/compatibility'
import { compatibilityFromBigFiveAttachment } from '../services/compatibility'
import {
  findStablePartner,
  gaeShapleyStableMatch,
} from '../services/stableMatch'

const SELF_ID = '__self__'

type Participant = {
  id: string | number
  gender: Profile['gender']
  bigFive: BigFiveScores
  attachment: AttachmentStyle
  profile: Profile | null // null only for self
}

export type StableMatchReason =
  | 'no-pool'
  | 'unsupported-gender'
  | 'no-personality'
  | 'no-opposite'
  | 'unmatched'

export type StableMatchVerdict = {
  /** Self's stable partner in the current pool. Null when none exists. */
  match: Profile | null
  /** Why no match (set when `match` is null), or null when match exists. */
  reason: StableMatchReason | null
  /** Total stable pairs found across the bipartite computation. */
  totalPairs: number
  /** True if a given candidate is self's G-S stable match. Useful for badges. */
  isStableMatch: (candidateId: number) => boolean
}

const EMPTY_VERDICT = (
  reason: StableMatchReason,
): StableMatchVerdict => ({
  match: null,
  reason,
  totalPairs: 0,
  isStableMatch: () => false,
})

export function useStableMatch(
  selfProfile: SelfProfile,
  pool: Profile[],
): StableMatchVerdict {
  return useMemo(() => {
    if (pool.length === 0) return EMPTY_VERDICT('no-pool')

    const selfGender = selfProfile.gender
    if (selfGender !== 'Woman' && selfGender !== 'Man') {
      return EMPTY_VERDICT('unsupported-gender')
    }

    const selfBigFive = selfProfile.lovePersonality?.bigFive
    const selfAttachment = selfProfile.lovePersonality?.attachment
    if (!selfBigFive || !selfAttachment) {
      return EMPTY_VERDICT('no-personality')
    }

    const selfParticipant: Participant = {
      id: SELF_ID,
      gender: selfGender as Profile['gender'],
      bigFive: selfBigFive,
      attachment: selfAttachment,
      profile: null,
    }

    // Only include pool members who have the Tier A personality fields —
    // without them, compatibility falls back to a neutral 50 and the G-S
    // result is noise rather than signal.
    const poolParticipants: Participant[] = pool
      .filter((p) => p.bigFive && p.attachmentStyle)
      .map((p) => ({
        id: p.id,
        gender: p.gender,
        bigFive: p.bigFive as BigFiveScores,
        attachment: p.attachmentStyle as AttachmentStyle,
        profile: p,
      }))

    const all = [selfParticipant, ...poolParticipants]
    const oppositeGender: Profile['gender'] =
      selfGender === 'Woman' ? 'Man' : 'Woman'

    const proposers = all.filter((p) => p.gender === selfGender)
    const receivers = all.filter((p) => p.gender === oppositeGender)

    if (receivers.length === 0) return EMPTY_VERDICT('no-opposite')

    const result = gaeShapleyStableMatch<Participant>({
      proposers,
      receivers,
      scoreOf: (a, b) =>
        compatibilityFromBigFiveAttachment(
          a.bigFive,
          a.attachment,
          b.bigFive,
          b.attachment,
        ),
      identify: (p) => p.id,
    })

    const partner = findStablePartner(result, (p) => p.id, SELF_ID)

    if (!partner || !partner.profile) {
      return {
        match: null,
        reason: 'unmatched',
        totalPairs: result.pairs.length,
        isStableMatch: () => false,
      }
    }

    const matchProfileId = partner.profile.id
    return {
      match: partner.profile,
      reason: null,
      totalPairs: result.pairs.length,
      isStableMatch: (candidateId: number) => candidateId === matchProfileId,
    }
  }, [selfProfile, pool])
}
