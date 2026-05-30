// Gale-Shapley stable-matching algorithm (1962).
//
// David Gale and Lloyd Shapley proved that for any two equal-sized groups
// with ranked preferences over the other side, there always exists a
// *stable matching* — a pairing where no two people from opposite sides
// would both prefer each other over their current partners. Shapley won
// the Nobel Prize in Economics (2012) for this and related work.
//
// Used since the 1950s to assign US medical residents to hospitals
// (the NRMP "Match"), in school-choice systems worldwide, and now —
// increasingly — in dating-app matching (see Hinge's public 2026 claims
// about a +20–22% match-success lift from intent-aware filters on top
// of stable matching).
//
// Properties worth knowing:
//   - The algorithm always terminates and produces a stable matching.
//   - It is *proposer-optimal*: the proposing side gets the best stable
//     partner they could possibly have; the receiving side gets the
//     worst stable partner they could possibly have. So who proposes
//     matters morally; in dating-app use this asymmetry should be
//     considered when picking which group proposes.
//   - O(n²) time in the worst case, plenty fast for invite-only scales.
//   - Unequal-size groups: extra members on the larger side stay
//     unmatched; same algorithm, same stability guarantee for the
//     matched subset.
//
// In Privé, we use this as a second lens alongside our AI compatibility
// scoring — same input data, very different question. AI score asks
// "how compatible are you two?"; G-S asks "given the full pool right
// now, would this be a stable pair, or would one of you defect?"

export type StableMatchPair<T> = {
  proposer: T
  receiver: T
}

export type StableMatchResult<T> = {
  pairs: StableMatchPair<T>[]
  unmatchedProposers: T[]
  unmatchedReceivers: T[]
}

export type StableMatchInput<T> = {
  /** The side that proposes — gets the proposer-optimal stable match. */
  proposers: T[]
  /** The side that receives proposals — gets the proposer-pessimal stable match. */
  receivers: T[]
  /**
   * For a given person on either side, returns their preference score for
   * the other person. Higher score = more preferred.
   * Called as `scoreOf(proposer, receiver)` and `scoreOf(receiver, proposer)`.
   */
  scoreOf: (a: T, b: T) => number
  /** Stable identity for tracking. Two items with the same id are equal. */
  identify: (item: T) => string | number
}

export function gaeShapleyStableMatch<T>(
  input: StableMatchInput<T>,
): StableMatchResult<T> {
  const { proposers, receivers, scoreOf, identify } = input

  if (proposers.length === 0 || receivers.length === 0) {
    return {
      pairs: [],
      unmatchedProposers: [...proposers],
      unmatchedReceivers: [...receivers],
    }
  }

  // For each proposer, build a sorted list of receivers (highest preference first).
  const proposerPrefs = new Map<string | number, T[]>()
  for (const p of proposers) {
    const sorted = receivers
      .slice()
      .sort((a, b) => scoreOf(p, b) - scoreOf(p, a))
    proposerPrefs.set(identify(p), sorted)
  }

  // For each receiver, build a score lookup against every proposer so we
  // can compare offers in O(1) (avoids re-sorting on each round).
  const receiverScores = new Map<
    string | number,
    Map<string | number, number>
  >()
  for (const r of receivers) {
    const scores = new Map<string | number, number>()
    for (const p of proposers) {
      scores.set(identify(p), scoreOf(r, p))
    }
    receiverScores.set(identify(r), scores)
  }

  // Tentative pairings: receiver_id → proposer
  const matches = new Map<string | number, T>()

  // Index into each proposer's preference list (the next receiver to ask).
  const nextIdx = new Map<string | number, number>()
  for (const p of proposers) nextIdx.set(identify(p), 0)

  // Queue of proposers still looking for a stable partner.
  const queue: T[] = [...proposers]

  while (queue.length > 0) {
    const proposer = queue.shift() as T
    const proposerId = identify(proposer)
    const prefs = proposerPrefs.get(proposerId) ?? []
    const idx = nextIdx.get(proposerId) ?? 0

    // Exhausted their preferences — leaves them unmatched.
    if (idx >= prefs.length) continue

    const target = prefs[idx] as T
    const targetId = identify(target)
    nextIdx.set(proposerId, idx + 1)

    const currentHolder = matches.get(targetId)
    if (!currentHolder) {
      matches.set(targetId, proposer)
      continue
    }

    // Compare the new offer to the current tentative match.
    const scores = receiverScores.get(targetId)
    const newScore = scores?.get(proposerId) ?? -Infinity
    const currentScore = scores?.get(identify(currentHolder)) ?? -Infinity

    if (newScore > currentScore) {
      // Receiver prefers the new proposer — swap, displace the old one.
      matches.set(targetId, proposer)
      queue.push(currentHolder)
    } else {
      // Receiver sticks with current — new proposer keeps looking.
      queue.push(proposer)
    }
  }

  const receiverById = new Map<string | number, T>()
  for (const r of receivers) receiverById.set(identify(r), r)

  const pairs: StableMatchPair<T>[] = []
  const matchedProposerIds = new Set<string | number>()
  const matchedReceiverIds = new Set<string | number>()

  for (const [receiverId, proposer] of matches) {
    const receiver = receiverById.get(receiverId)
    if (!receiver) continue
    pairs.push({ proposer, receiver })
    matchedProposerIds.add(identify(proposer))
    matchedReceiverIds.add(receiverId)
  }

  return {
    pairs,
    unmatchedProposers: proposers.filter(
      (p) => !matchedProposerIds.has(identify(p)),
    ),
    unmatchedReceivers: receivers.filter(
      (r) => !matchedReceiverIds.has(identify(r)),
    ),
  }
}

/**
 * Convenience helper: given a stable-match result and an identity,
 * returns that person's stable partner if any. Works for either side.
 */
export function findStablePartner<T>(
  result: StableMatchResult<T>,
  identify: (item: T) => string | number,
  selfId: string | number,
): T | null {
  for (const { proposer, receiver } of result.pairs) {
    if (identify(proposer) === selfId) return receiver
    if (identify(receiver) === selfId) return proposer
  }
  return null
}
