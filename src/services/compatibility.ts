export type PersonalityAnswer = 'A' | 'B'

export type PersonalityQuestion = {
  id: number
  axis: 'energy' | 'pace' | 'social' | 'planning'
  prompt: string
  optionA: string
  optionB: string
}

export type PersonalityVector = {
  energy: number
  pace: number
  social: number
  planning: number
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 1,
    axis: 'energy',
    prompt: 'Your ideal weekend feels best when it is:',
    optionA: 'Calm and restorative',
    optionB: 'Dynamic and full of plans',
  },
  {
    id: 2,
    axis: 'energy',
    prompt: 'In a new place, you usually:',
    optionA: 'Observe first',
    optionB: 'Jump right in',
  },
  {
    id: 3,
    axis: 'pace',
    prompt: 'You prefer dating that is:',
    optionA: 'Thoughtful and slow-burn',
    optionB: 'Spontaneous and fast-moving',
  },
  {
    id: 4,
    axis: 'pace',
    prompt: 'When deciding plans, you are more:',
    optionA: 'Deliberate',
    optionB: 'Impulsive',
  },
  {
    id: 5,
    axis: 'social',
    prompt: 'In conversations, you often:',
    optionA: 'Go deep with one person',
    optionB: 'Energize groups',
  },
  {
    id: 6,
    axis: 'social',
    prompt: 'At events, you usually:',
    optionA: 'Stay with familiar people',
    optionB: 'Meet everyone',
  },
  {
    id: 7,
    axis: 'planning',
    prompt: 'For trips, your style is:',
    optionA: 'Map it out early',
    optionB: 'Figure it out as you go',
  },
  {
    id: 8,
    axis: 'planning',
    prompt: 'You feel best when life is:',
    optionA: 'Structured',
    optionB: 'Open-ended',
  },
]

// Romanian translations of PERSONALITY_QUESTIONS. Question id + axis
// stay identical so personality codes (DMFR etc.) remain stable across
// languages — only displayed prompts/options change.
export const PERSONALITY_QUESTIONS_RO: PersonalityQuestion[] = [
  {
    id: 1,
    axis: 'energy',
    prompt: 'Weekendul ideal pentru tine este:',
    optionA: 'Calm și odihnitor',
    optionB: 'Dinamic și plin de planuri',
  },
  {
    id: 2,
    axis: 'energy',
    prompt: 'Într-un loc nou, de obicei:',
    optionA: 'Observi prima dată',
    optionB: 'Te arunci direct în acțiune',
  },
  {
    id: 3,
    axis: 'pace',
    prompt: 'Preferi întâlnirile care sunt:',
    optionA: 'Gânditoare, cu ardere lentă',
    optionB: 'Spontane și cu ritm rapid',
  },
  {
    id: 4,
    axis: 'pace',
    prompt: 'Când iei decizii pentru planuri, ești mai mult:',
    optionA: 'Chibzuit',
    optionB: 'Impulsiv',
  },
  {
    id: 5,
    axis: 'social',
    prompt: 'În conversații, de cele mai multe ori:',
    optionA: 'Mergi în profunzime cu o singură persoană',
    optionB: 'Aprinzi energia grupului',
  },
  {
    id: 6,
    axis: 'social',
    prompt: 'La evenimente, de obicei:',
    optionA: 'Stai cu oamenii familiari',
    optionB: 'Cunoști pe toată lumea',
  },
  {
    id: 7,
    axis: 'planning',
    prompt: 'În călătorii, stilul tău este:',
    optionA: 'Planifici totul din timp',
    optionB: 'Te descurci pe parcurs',
  },
  {
    id: 8,
    axis: 'planning',
    prompt: 'Te simți cel mai bine când viața este:',
    optionA: 'Structurată',
    optionB: 'Deschisă, fără limite stricte',
  },
]

// Language-aware lookup. Algorithms (compatibilityFromAnswers,
// personalityCodeFromAnswers) continue to use PERSONALITY_QUESTIONS
// directly because they only need axis + id — the displayed prompt
// text is irrelevant to scoring. UI consumers should call this helper.
import type { AppLanguage } from '../domain'
export const getPersonalityQuestions = (language: AppLanguage): PersonalityQuestion[] =>
  language === 'ro' ? PERSONALITY_QUESTIONS_RO : PERSONALITY_QUESTIONS

const AXIS_QUESTION_COUNT = 2
const DEFAULT_VECTOR: PersonalityVector = {
  energy: 50,
  pace: 50,
  social: 50,
  planning: 50,
}

export const sanitizeAnswers = (answers: unknown): PersonalityAnswer[] => {
  if (!Array.isArray(answers)) {
    return []
  }

  return answers
    .map((value) => (value === 'B' ? 'B' : value === 'A' ? 'A' : null))
    .filter((value): value is PersonalityAnswer => value !== null)
    .slice(0, PERSONALITY_QUESTIONS.length)
}

export const vectorFromAnswers = (answers: PersonalityAnswer[]): PersonalityVector => {
  const safe = sanitizeAnswers(answers)
  if (safe.length === 0) {
    return DEFAULT_VECTOR
  }

  const buckets: Record<keyof PersonalityVector, number> = {
    energy: 0,
    pace: 0,
    social: 0,
    planning: 0,
  }

  PERSONALITY_QUESTIONS.forEach((question, index) => {
    const answer = safe[index]
    if (answer === 'B') {
      buckets[question.axis] += 1
    }
  })

  return {
    energy: Math.round((buckets.energy / AXIS_QUESTION_COUNT) * 100),
    pace: Math.round((buckets.pace / AXIS_QUESTION_COUNT) * 100),
    social: Math.round((buckets.social / AXIS_QUESTION_COUNT) * 100),
    planning: Math.round((buckets.planning / AXIS_QUESTION_COUNT) * 100),
  }
}

export const personalityCodeFromAnswers = (answers: PersonalityAnswer[]): string => {
  const vector = vectorFromAnswers(answers)
  const e = vector.energy >= 50 ? 'D' : 'C' // Dynamic / Calm
  const p = vector.pace >= 50 ? 'S' : 'M' // Spontaneous / Measured
  const s = vector.social >= 50 ? 'O' : 'F' // Outgoing / Focused
  const l = vector.planning >= 50 ? 'A' : 'R' // Adaptive / Reliable
  return `${e}${p}${s}${l}`
}

export const compatibilityFromAnswers = (
  mine: PersonalityAnswer[],
  theirs: PersonalityAnswer[],
): number => {
  const a = vectorFromAnswers(mine)
  const b = vectorFromAnswers(theirs)
  const diffs = [
    Math.abs(a.energy - b.energy),
    Math.abs(a.pace - b.pace),
    Math.abs(a.social - b.social),
    Math.abs(a.planning - b.planning),
  ]
  const distance = diffs.reduce((sum, value) => sum + value, 0) / diffs.length
  const normalized = 100 - distance
  return Math.max(1, Math.min(99, Math.round(normalized)))
}

// Code-only fallback used when we have the OTHER user's personalityCode
// but not their raw answers — which is the case after the 2026-05-19
// privacy migration that moved answers into a server-only table.
// Lower fidelity than compatibilityFromAnswers (binary per axis vs.
// 3-level), but adequate for ranking the deck before E3 AI score lands.
export const compatibilityFromCodes = (
  mine: PersonalityAnswer[],
  theirCode: string,
): number => {
  if (!theirCode || theirCode.length !== 4) return 50
  const myCode = personalityCodeFromAnswers(mine)
  if (myCode.length !== 4) return 50
  let matches = 0
  for (let i = 0; i < 4; i++) {
    if (myCode[i] === theirCode[i]) matches += 1
  }
  // 4-of-4 = 99, 0-of-4 = 1, linear between.
  return Math.max(1, Math.min(99, Math.round((matches / 4) * 98 + 1)))
}
