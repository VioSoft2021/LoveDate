import { describe, it, expect } from 'vitest'
import { gaeShapleyStableMatch, findStablePartner } from './stableMatch'

// Helpers for the textbook examples: each person is just an id string,
// preferences are encoded as a Map from (id, id) → score so we can drive
// the algorithm with hand-tuned ranking lists.
type Person = { id: string }
const identify = (p: Person) => p.id
const scoreOfFor = (table: Record<string, Record<string, number>>) =>
  (a: Person, b: Person) => table[a.id]?.[b.id] ?? 0

describe('gaeShapleyStableMatch — textbook example', () => {
  // Classic 3x3 from textbooks (the same one in the project's ROADMAP).
  // Men {A,B,C}, women {X,Y,Z}; higher number = more preferred.
  const men: Person[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
  const women: Person[] = [{ id: 'X' }, { id: 'Y' }, { id: 'Z' }]
  // A: X > Y > Z       X: B > A > C
  // B: X > Z > Y       Y: A > B > C
  // C: Y > X > Z       Z: A > B > C
  const prefs: Record<string, Record<string, number>> = {
    A: { X: 3, Y: 2, Z: 1 },
    B: { X: 3, Z: 2, Y: 1 },
    C: { Y: 3, X: 2, Z: 1 },
    X: { B: 3, A: 2, C: 1 },
    Y: { A: 3, B: 2, C: 1 },
    Z: { A: 3, B: 2, C: 1 },
  }

  it('produces the expected stable matching {A↔Y, B↔X, C↔Z}', () => {
    const result = gaeShapleyStableMatch({
      proposers: men,
      receivers: women,
      scoreOf: scoreOfFor(prefs),
      identify,
    })
    const pairMap = new Map<string, string>()
    for (const { proposer, receiver } of result.pairs) {
      pairMap.set(proposer.id, receiver.id)
    }
    expect(pairMap.get('A')).toBe('Y')
    expect(pairMap.get('B')).toBe('X')
    expect(pairMap.get('C')).toBe('Z')
    expect(result.unmatchedProposers).toHaveLength(0)
    expect(result.unmatchedReceivers).toHaveLength(0)
  })

  it('produces a STABLE matching — no two people would both defect', () => {
    const result = gaeShapleyStableMatch({
      proposers: men,
      receivers: women,
      scoreOf: scoreOfFor(prefs),
      identify,
    })
    const partnerOf = new Map<string, string>()
    for (const { proposer, receiver } of result.pairs) {
      partnerOf.set(proposer.id, receiver.id)
      partnerOf.set(receiver.id, proposer.id)
    }
    // For every man-woman cross pair (m, w), if m prefers w over his
    // current partner AND w prefers m over her current partner, the
    // matching is NOT stable. Assert no such defection exists.
    for (const m of men) {
      const mPartnerId = partnerOf.get(m.id)
      const mPartnerScore = mPartnerId ? prefs[m.id]?.[mPartnerId] ?? -1 : -1
      for (const w of women) {
        if (w.id === mPartnerId) continue
        const wPartnerId = partnerOf.get(w.id)
        const wPartnerScore = wPartnerId
          ? prefs[w.id]?.[wPartnerId] ?? -1
          : -1
        const mPrefsW = prefs[m.id]?.[w.id] ?? 0
        const wPrefsM = prefs[w.id]?.[m.id] ?? 0
        const wouldBothDefect =
          mPrefsW > mPartnerScore && wPrefsM > wPartnerScore
        expect(wouldBothDefect).toBe(false)
      }
    }
  })
})

describe('gaeShapleyStableMatch — proposer-optimal property', () => {
  it('gives proposers their best-possible stable partner', () => {
    // 2x2 case where two stable matchings exist; G-S should pick the
    // one that's optimal for the proposers.
    // Men {M1,M2}, Women {W1,W2}.
    // M1: W1 > W2,  M2: W2 > W1     W1: M2 > M1,  W2: M1 > M2
    // Two stable matchings: {M1↔W1, M2↔W2} (man-optimal)
    //                   and {M1↔W2, M2↔W1} (woman-optimal).
    const men: Person[] = [{ id: 'M1' }, { id: 'M2' }]
    const women: Person[] = [{ id: 'W1' }, { id: 'W2' }]
    const prefs: Record<string, Record<string, number>> = {
      M1: { W1: 2, W2: 1 },
      M2: { W2: 2, W1: 1 },
      W1: { M2: 2, M1: 1 },
      W2: { M1: 2, M2: 1 },
    }

    const menPropose = gaeShapleyStableMatch({
      proposers: men,
      receivers: women,
      scoreOf: scoreOfFor(prefs),
      identify,
    })
    const map = new Map<string, string>()
    for (const { proposer, receiver } of menPropose.pairs) {
      map.set(proposer.id, receiver.id)
    }
    // Men got their top choice — proposer-optimal.
    expect(map.get('M1')).toBe('W1')
    expect(map.get('M2')).toBe('W2')

    // Swap the roles — women propose, women should now get their top choice.
    const womenPropose = gaeShapleyStableMatch({
      proposers: women,
      receivers: men,
      scoreOf: scoreOfFor(prefs),
      identify,
    })
    const wMap = new Map<string, string>()
    for (const { proposer, receiver } of womenPropose.pairs) {
      wMap.set(proposer.id, receiver.id)
    }
    expect(wMap.get('W1')).toBe('M2')
    expect(wMap.get('W2')).toBe('M1')
  })
})

describe('gaeShapleyStableMatch — edge cases', () => {
  it('returns an empty matching for empty input', () => {
    const result = gaeShapleyStableMatch({
      proposers: [],
      receivers: [],
      scoreOf: () => 0,
      identify,
    })
    expect(result.pairs).toEqual([])
    expect(result.unmatchedProposers).toEqual([])
    expect(result.unmatchedReceivers).toEqual([])
  })

  it('leaves the extra people unmatched when sides are unequal', () => {
    const proposers: Person[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const receivers: Person[] = [{ id: 'X' }, { id: 'Y' }]
    const prefs: Record<string, Record<string, number>> = {
      A: { X: 2, Y: 1 },
      B: { X: 2, Y: 1 },
      C: { X: 2, Y: 1 },
      X: { A: 3, B: 2, C: 1 },
      Y: { A: 3, B: 2, C: 1 },
    }
    const result = gaeShapleyStableMatch({
      proposers,
      receivers,
      scoreOf: scoreOfFor(prefs),
      identify,
    })
    expect(result.pairs).toHaveLength(2)
    expect(result.unmatchedProposers).toHaveLength(1)
    expect(result.unmatchedProposers[0]?.id).toBe('C')
    expect(result.unmatchedReceivers).toHaveLength(0)
  })

  it('handles symmetric scoring (compatibility-style) without crashing', () => {
    // With symmetric scoring (which is what Privé\'s compatibility
    // function returns), the algorithm still produces a stable matching;
    // the order just happens to be the same as compatibility-sorted
    // pairing when preferences fully agree.
    const proposers: Person[] = [{ id: 'a' }, { id: 'b' }]
    const receivers: Person[] = [{ id: 'x' }, { id: 'y' }]
    const symScore = (p: Person, q: Person): number => {
      const key = [p.id, q.id].sort().join(':')
      const table: Record<string, number> = {
        'a:x': 80,
        'a:y': 60,
        'b:x': 60,
        'b:y': 90,
      }
      return table[key] ?? 0
    }
    const result = gaeShapleyStableMatch({
      proposers,
      receivers,
      scoreOf: symScore,
      identify,
    })
    expect(result.pairs).toHaveLength(2)
    const map = new Map<string, string>()
    for (const { proposer, receiver } of result.pairs) {
      map.set(proposer.id, receiver.id)
    }
    expect(map.get('a')).toBe('x')
    expect(map.get('b')).toBe('y')
  })
})

describe('findStablePartner', () => {
  it("returns the matched partner for either side's id, or null if unmatched", () => {
    const proposers: Person[] = [{ id: 'A' }]
    const receivers: Person[] = [{ id: 'X' }]
    const result = gaeShapleyStableMatch({
      proposers,
      receivers,
      scoreOf: () => 1,
      identify,
    })
    expect(findStablePartner(result, identify, 'A')?.id).toBe('X')
    expect(findStablePartner(result, identify, 'X')?.id).toBe('A')
    expect(findStablePartner(result, identify, 'NOPE')).toBeNull()
  })
})
