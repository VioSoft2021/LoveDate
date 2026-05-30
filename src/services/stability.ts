// Relationship Stability Assessment (2026-05-30)
//
// An OPTIONAL second assessment, distinct from the Love Personality quiz.
// Where Love Personality (Big Five + attachment) answers "how compatible
// are you?", this answers "how *durable* is this pairing likely to be?" —
// and its results feed the Gale-Shapley matching (see useStableMatch) so
// the stable match becomes stability-aware.
//
// Framing note: this is NOT "the Gale-Shapley test". Gale-Shapley is a
// pool-ranking algorithm; this is the assessment that *powers* a richer,
// stability-weighted G-S match and a per-match stability reading.
//
// The instrument is 12 five-point Likert items across four research-backed
// predictors of relationship durability:
//   - Conflict & Repair        (Gottman: repair attempts, avoiding the
//                                "Four Horsemen" — stonewalling, contempt)
//   - Commitment & Investment  (Rusbult Investment Model: investment size,
//                                quality of alternatives)
//   - Communication            (responsiveness, bids for connection,
//                                expressing needs)
//   - Values alignment         (children / finances / life pace) — scored
//                                pairwise, since alignment is a property of
//                                the *pair*, not the individual.
//
// Keeping every item on the same 5-point Likert scale lets the assessment
// reuse the Love Personality quiz UI verbatim; the three value items are
// bucketed into categorical stances during derivation.

import type { AppLanguage } from '../domain'
import type { LikertAnswer } from './compatibility'

// ── Types ───────────────────────────────────────────────────────────

/** The three trait dimensions (each 0–100; higher = more stabilising). */
export type StabilityTraitDimension =
  | 'conflictRepair'
  | 'commitment'
  | 'communication'

/** Categorical value stances, derived from the value Likert items. */
export type ChildrenStance = 'yes' | 'unsure' | 'no'
export type FinanceStance = 'saver' | 'balanced' | 'spender'
export type PaceStance = 'fast' | 'balanced' | 'slow'

export type StabilityValues = {
  children: ChildrenStance
  finances: FinanceStance
  pace: PaceStance
}

/** Optional Claude-written per-match reveal (filled in M5). */
export type StabilityReveal = {
  archetype: string
  headline: string
  description: string
  strengths: string[]
  watchPoints: string[]
  sharedWork: string
  language: 'en' | 'ro'
  generatedAt: string
}

/** A user's full stability profile, stored on the SelfProfile / Profile. */
export type StabilityProfile = {
  conflictRepair: number
  commitment: number
  communication: number
  values: StabilityValues
  completedAt: string // ISO timestamp
}

/** Per-match stability verdict bands (no hard percentage shown to users). */
export type StabilityBand = 'strong' | 'solid' | 'building' | 'fragile'

/**
 * A single reason behind a verdict. Returned as a structured descriptor
 * (key + polarity) so the UI can localise it; never a baked English string.
 */
export type StabilityDriverKey =
  | 'conflictRepair'
  | 'commitment'
  | 'communication'
  | 'children'
  | 'finances'
  | 'pace'

export type StabilityDriver = {
  key: StabilityDriverKey
  polarity: 'positive' | 'risk'
}

export type StabilityVerdict = {
  /** Internal 0–100 stability score (drives the band; not shown raw). */
  score: number
  band: StabilityBand
  /** Top 2–3 plain-language reasons, ordered most-salient first. */
  drivers: StabilityDriver[]
}

/** A single Likert question in the assessment. */
export type StabilityQuestion = {
  id: number
  measures:
    | { type: 'trait'; dimension: StabilityTraitDimension; reverse: boolean }
    | { type: 'value'; field: keyof StabilityValues }
  prompt: string
}

// ── Questions ───────────────────────────────────────────────────────
//
// 12 items, fixed id order. Trait items map to a dimension (some reverse-
// keyed). Value items are bucketed into stances during derivation. The UI
// framing (section stems, transitions) lives in uiText.ts; only the per-item
// prompt lives here.

const buildEnQuestions = (): StabilityQuestion[] => [
  // Conflict & Repair (Gottman)
  { id: 1,  measures: { type: 'trait', dimension: 'conflictRepair', reverse: true  }, prompt: 'When we argue, I tend to shut down and stop talking.' },
  { id: 2,  measures: { type: 'trait', dimension: 'conflictRepair', reverse: false }, prompt: "After a disagreement, I'm usually the one who reaches out to make things right." },
  { id: 3,  measures: { type: 'trait', dimension: 'conflictRepair', reverse: true  }, prompt: 'In the heat of an argument, I sometimes say things I know are hurtful.' },
  // Commitment & Investment (Rusbult)
  { id: 4,  measures: { type: 'trait', dimension: 'commitment',     reverse: false }, prompt: 'Once I commit to someone, I invest fully for the long run.' },
  { id: 5,  measures: { type: 'trait', dimension: 'commitment',     reverse: true  }, prompt: "I keep an eye out for better options even when I'm with someone." },
  { id: 6,  measures: { type: 'trait', dimension: 'commitment',     reverse: false }, prompt: 'I am willing to make real sacrifices to keep a relationship strong.' },
  // Communication & Responsiveness
  { id: 7,  measures: { type: 'trait', dimension: 'communication',  reverse: false }, prompt: 'I tell my partner what I need instead of expecting them to guess.' },
  { id: 8,  measures: { type: 'trait', dimension: 'communication',  reverse: false }, prompt: 'When my partner reaches out for attention or comfort, I notice and respond.' },
  { id: 9,  measures: { type: 'trait', dimension: 'communication',  reverse: true  }, prompt: 'I find it hard to talk about my feelings.' },
  // Values (bucketed to stances)
  { id: 10, measures: { type: 'value', field: 'children' }, prompt: 'I want to have children.' },
  { id: 11, measures: { type: 'value', field: 'finances' }, prompt: 'I am careful with money and prefer saving over spending.' },
  { id: 12, measures: { type: 'value', field: 'pace'     }, prompt: 'I prefer a fast-paced, busy life over a slow, quiet one.' },
]

const buildRoQuestions = (): StabilityQuestion[] => [
  // Conflict & Repair
  { id: 1,  measures: { type: 'trait', dimension: 'conflictRepair', reverse: true  }, prompt: 'Când ne certăm, tind să mă închid și să nu mai vorbesc.' },
  { id: 2,  measures: { type: 'trait', dimension: 'conflictRepair', reverse: false }, prompt: 'După o ceartă, de obicei eu sunt cel care face primul pas spre împăcare.' },
  { id: 3,  measures: { type: 'trait', dimension: 'conflictRepair', reverse: true  }, prompt: 'La nervi, uneori spun lucruri despre care știu că rănesc.' },
  // Commitment & Investment
  { id: 4,  measures: { type: 'trait', dimension: 'commitment',     reverse: false }, prompt: 'Odată ce mă implic într-o relație, investesc pe deplin, pe termen lung.' },
  { id: 5,  measures: { type: 'trait', dimension: 'commitment',     reverse: true  }, prompt: 'Chiar și când sunt cu cineva, rămân cu ochii după opțiuni mai bune.' },
  { id: 6,  measures: { type: 'trait', dimension: 'commitment',     reverse: false }, prompt: 'Sunt dispus să fac sacrificii reale ca să țin o relație puternică.' },
  // Communication & Responsiveness
  { id: 7,  measures: { type: 'trait', dimension: 'communication',  reverse: false }, prompt: 'Îi spun partenerului de ce am nevoie, în loc să aștept să ghicească.' },
  { id: 8,  measures: { type: 'trait', dimension: 'communication',  reverse: false }, prompt: 'Când partenerul caută atenție sau alinare, observ și răspund.' },
  { id: 9,  measures: { type: 'trait', dimension: 'communication',  reverse: true  }, prompt: 'Îmi este greu să vorbesc despre ce simt.' },
  // Values
  { id: 10, measures: { type: 'value', field: 'children' }, prompt: 'Îmi doresc să am copii.' },
  { id: 11, measures: { type: 'value', field: 'finances' }, prompt: 'Sunt atent cu banii și prefer să economisesc decât să cheltui.' },
  { id: 12, measures: { type: 'value', field: 'pace'     }, prompt: 'Prefer o viață alertă și plină decât una liniștită și așezată.' },
]

const EN_QUESTIONS = buildEnQuestions()
const RO_QUESTIONS = buildRoQuestions()

/** Always returns the 12 questions in stable id order. */
export const getStabilityQuestions = (language: AppLanguage): StabilityQuestion[] =>
  language === 'ro' ? RO_QUESTIONS : EN_QUESTIONS

export const STABILITY_QUESTION_COUNT = 12
export const STABILITY_TRAIT_QUESTION_COUNT = 9
export const STABILITY_VALUE_QUESTION_COUNT = 3

// ── Derivation (answers → profile) ─────────────────────────────────

const reverseKey = (x: LikertAnswer): number => 6 - x // 5-point reverse

const likertToScore0to100 = (avg: number): number =>
  Math.max(0, Math.min(100, Math.round((avg - 1) * 25)))

const clampAnswer = (v: LikertAnswer | undefined): LikertAnswer =>
  v === 1 || v === 2 || v === 3 || v === 4 || v === 5 ? v : 3

const childrenFrom = (v: LikertAnswer): ChildrenStance =>
  v >= 4 ? 'yes' : v <= 2 ? 'no' : 'unsure'
const financeFrom = (v: LikertAnswer): FinanceStance =>
  v >= 4 ? 'saver' : v <= 2 ? 'spender' : 'balanced'
const paceFrom = (v: LikertAnswer): PaceStance =>
  v >= 4 ? 'fast' : v <= 2 ? 'slow' : 'balanced'

/**
 * Build the StabilityProfile from the 12 Likert answers (id order).
 * Indices 0–8 are trait items; 9–11 are the value items.
 * Returns null unless exactly 12 answers are provided.
 */
export const stabilityProfileFromAnswers = (
  answers: LikertAnswer[],
): StabilityProfile | null => {
  if (!Array.isArray(answers) || answers.length !== STABILITY_QUESTION_COUNT) {
    return null
  }
  const a = (id: number): LikertAnswer => clampAnswer(answers[id - 1])
  const mean3 = (x: number, y: number, z: number) => (x + y + z) / 3

  return {
    conflictRepair: likertToScore0to100(
      mean3(reverseKey(a(1)), a(2), reverseKey(a(3))),
    ),
    commitment: likertToScore0to100(
      mean3(a(4), reverseKey(a(5)), a(6)),
    ),
    communication: likertToScore0to100(
      mean3(a(7), a(8), reverseKey(a(9))),
    ),
    values: {
      children: childrenFrom(a(10)),
      finances: financeFrom(a(11)),
      pace: paceFrom(a(12)),
    },
    completedAt: new Date().toISOString(),
  }
}

// ── Pairwise scoring ────────────────────────────────────────────────

const TRAIT_KEYS: StabilityTraitDimension[] = [
  'conflictRepair',
  'commitment',
  'communication',
]

/**
 * Per-dimension pair score. A relationship is only as stable as its weaker
 * link on these "more is better" traits, so we blend the mean with the min
 * (the lower partner drags the pair down, but not all the way).
 */
const pairTrait = (a: number, b: number): number =>
  Math.round(0.5 * ((a + b) / 2) + 0.5 * Math.min(a, b))

// Value-alignment lookups. Children carries the most weight (a definite
// mismatch is the classic relationship-ender); finances + pace are softer.
const childrenAlign = (a: ChildrenStance, b: ChildrenStance): number => {
  if (a === b) return a === 'unsure' ? 70 : 100
  if (a === 'unsure' || b === 'unsure') return 60
  return 8 // definite yes vs definite no
}
const tristateAlign = <T extends string>(a: T, b: T, mid: T): number => {
  if (a === b) return 92
  if (a === mid || b === mid) return 68 // one is "balanced" — adjacent
  return 38 // the two extremes
}

/**
 * Stability verdict (0–100 score + band + drivers) between two profiles.
 * Blends 55% trait durability + 45% values alignment. Returns a neutral
 * "building" verdict when either side has no stability profile.
 */
export const stabilityFromProfiles = (
  mine: StabilityProfile | null | undefined,
  theirs: StabilityProfile | null | undefined,
): StabilityVerdict => {
  if (!mine || !theirs) {
    return { score: 50, band: 'building', drivers: [] }
  }

  // Trait component — average of the three per-dimension pair scores.
  const traitPairs: Record<StabilityTraitDimension, number> = {
    conflictRepair: pairTrait(mine.conflictRepair, theirs.conflictRepair),
    commitment: pairTrait(mine.commitment, theirs.commitment),
    communication: pairTrait(mine.communication, theirs.communication),
  }
  const traitComponent =
    TRAIT_KEYS.reduce((sum, k) => sum + traitPairs[k], 0) / TRAIT_KEYS.length

  // Values component — children weighted heaviest.
  const childrenScore = childrenAlign(mine.values.children, theirs.values.children)
  const financeScore = tristateAlign(mine.values.finances, theirs.values.finances, 'balanced')
  const paceScore = tristateAlign(mine.values.pace, theirs.values.pace, 'balanced')
  const valuesComponent =
    childrenScore * 0.5 + financeScore * 0.25 + paceScore * 0.25

  let score = Math.max(
    1,
    Math.min(99, Math.round(traitComponent * 0.55 + valuesComponent * 0.45)),
  )

  // A definite children mismatch (one wants kids, the other doesn't) is the
  // classic long-term dealbreaker — cap the score so strong traits can't
  // mask it, and it always surfaces as the leading risk below.
  const childrenMismatch = childrenScore < 40
  if (childrenMismatch) score = Math.min(score, 52)

  const band: StabilityBand =
    score >= 78 ? 'strong' : score >= 62 ? 'solid' : score >= 45 ? 'building' : 'fragile'

  // ── Drivers ──
  const positives: StabilityDriver[] = []
  const risks: StabilityDriver[] = []

  for (const k of TRAIT_KEYS) {
    if (traitPairs[k] >= 70) positives.push({ key: k, polarity: 'positive' })
    else if (traitPairs[k] < 48) risks.push({ key: k, polarity: 'risk' })
  }
  // Children is the highest-priority signal in either direction.
  if (childrenScore >= 90) positives.unshift({ key: 'children', polarity: 'positive' })
  else if (childrenScore < 40) risks.unshift({ key: 'children', polarity: 'risk' })
  if (financeScore >= 90) positives.push({ key: 'finances', polarity: 'positive' })
  else if (financeScore < 45) risks.push({ key: 'finances', polarity: 'risk' })
  if (paceScore >= 90) positives.push({ key: 'pace', polarity: 'positive' })
  else if (paceScore < 50) risks.push({ key: 'pace', polarity: 'risk' })

  // Strong/solid bands lead with what works; lower bands lead with the main
  // risk, then a redeeming strength, so the reason never reads as all-doom.
  const drivers =
    band === 'strong' || band === 'solid'
      ? [...positives, ...risks].slice(0, 3)
      : [...risks, ...positives].slice(0, 3)

  return { score, band, drivers }
}
