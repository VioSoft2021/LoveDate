export const ZODIAC_EMOJI: Record<string, string> = {
  Aries: '♈️',
  Taurus: '♉️',
  Gemini: '♊️',
  Cancer: '♋️',
  Leo: '♌️',
  Virgo: '♍️',
  Libra: '♎️',
  Scorpio: '♏️',
  Sagittarius: '♐️',
  Capricorn: '♑️',
  Aquarius: '♒️',
  Pisces: '♓️',
}

export const ZODIAC_DESCRIPTIONS: Record<
  string,
  {
    overview: string
    loveStyle: string
    communication: string
    greenFlags: string
    growthEdge: string
    bestMatches: string
  }
> = {
  Aries: {
    overview: 'Bold initiator with passionate momentum. Aries moves fast when chemistry feels real.',
    loveStyle: 'Direct, playful, and action-oriented. Loves dates that feel alive and adventurous.',
    communication: 'Honest and immediate. Prefers clarity over mixed signals.',
    greenFlags: 'Courage, loyalty in conflict, and willingness to show up quickly.',
    growthEdge: 'Can rush emotional pacing before deeper alignment is established.',
    bestMatches: 'Leo, Sagittarius, Gemini, Aquarius, Libra',
  },
  Taurus: {
    overview: 'Steady sensualist who builds love through consistency, touch, and trust.',
    loveStyle: 'Slow-burn and devoted. Invests deeply once safety is established.',
    communication: 'Grounded and practical. Values reliability in words and actions.',
    greenFlags: 'Emotional stability, patience, and dependable follow-through.',
    growthEdge: 'May resist change or hold on to comfort too long.',
    bestMatches: 'Virgo, Capricorn, Cancer, Pisces',
  },
  Gemini: {
    overview: 'Curious connector who bonds through ideas, humor, and mental spark.',
    loveStyle: 'Playful, social, and novelty-seeking. Thrives in dynamic conversations.',
    communication: 'Fast, expressive, and witty. Loves responsive dialogue.',
    greenFlags: 'Open-mindedness, adaptability, and social intelligence.',
    growthEdge: 'Can struggle with emotional consistency when bored.',
    bestMatches: 'Libra, Aquarius, Aries, Leo',
  },
  Cancer: {
    overview: 'Protective heart with strong emotional intuition and care instincts.',
    loveStyle: 'Nurturing, attachment-oriented, and deeply sentimental.',
    communication: 'Emotion-first and subtle. Reads tone and intention carefully.',
    greenFlags: 'Loyalty, compassion, and relationship dedication.',
    growthEdge: 'May withdraw or become defensive when feeling unsafe.',
    bestMatches: 'Scorpio, Pisces, Taurus, Virgo',
  },
  Leo: {
    overview: 'Warm spotlight giver who loves expressive romance and confident connection.',
    loveStyle: 'Generous, loyal, and affectionate. Enjoys visible appreciation.',
    communication: 'Open and charismatic. Responds well to sincere admiration.',
    greenFlags: 'Big-hearted devotion, protective instinct, and consistency in affection.',
    growthEdge: 'Can over-index on validation when feeling unseen.',
    bestMatches: 'Aries, Sagittarius, Gemini, Libra',
  },
  Virgo: {
    overview: 'Intentional partner who expresses love through care, precision, and effort.',
    loveStyle: 'Practical devotion. Builds trust through meaningful details.',
    communication: 'Clear, thoughtful, and solution-oriented.',
    greenFlags: 'Reliability, emotional responsibility, and strong standards.',
    growthEdge: 'May overanalyze or become too self-critical.',
    bestMatches: 'Taurus, Capricorn, Cancer, Scorpio',
  },
  Libra: {
    overview: 'Harmony seeker who values emotional balance, aesthetics, and mutuality.',
    loveStyle: 'Romantic, socially graceful, and partnership-focused.',
    communication: 'Diplomatic and relational. Prefers collaborative tone.',
    greenFlags: 'Fairness, charm, and commitment to mutual respect.',
    growthEdge: 'Can delay hard decisions to avoid conflict.',
    bestMatches: 'Gemini, Aquarius, Leo, Sagittarius',
  },
  Scorpio: {
    overview: 'Intensity and depth sign. Bonds through trust, loyalty, and emotional truth.',
    loveStyle: 'All-in attachment with strong protective and transformative energy.',
    communication: 'Private but piercingly honest when trust is built.',
    greenFlags: 'Emotional courage, loyalty, and deep commitment.',
    growthEdge: 'Can become guarded or controlling under uncertainty.',
    bestMatches: 'Cancer, Pisces, Virgo, Capricorn',
  },
  Sagittarius: {
    overview: 'Freedom-loving explorer with optimistic, curious dating energy.',
    loveStyle: 'Adventure-forward and honest. Needs space and shared growth.',
    communication: 'Straightforward, candid, and future-oriented.',
    greenFlags: 'Authenticity, positivity, and openness to exploration.',
    growthEdge: 'May avoid emotional heaviness if pace feels restrictive.',
    bestMatches: 'Aries, Leo, Libra, Aquarius',
  },
  Capricorn: {
    overview: 'Grounded builder who takes commitment seriously and plans long-term.',
    loveStyle: 'Stable, intentional, and loyalty-centered.',
    communication: 'Measured and practical. Prefers substance over drama.',
    greenFlags: 'Reliability, ambition, and strong relational accountability.',
    growthEdge: 'Can appear emotionally reserved during early stages.',
    bestMatches: 'Taurus, Virgo, Scorpio, Pisces',
  },
  Aquarius: {
    overview: 'Independent visionary who seeks authenticity, ideas, and mutual freedom.',
    loveStyle: 'Friendship-led intimacy with strong individuality.',
    communication: 'Conceptual, open-minded, and future-facing.',
    greenFlags: 'Respect for boundaries, originality, and intellectual honesty.',
    growthEdge: 'Can intellectualize emotions instead of feeling them fully.',
    bestMatches: 'Gemini, Libra, Sagittarius, Aries',
  },
  Pisces: {
    overview: 'Empathic dreamer with rich intuition and romantic imagination.',
    loveStyle: 'Tender, soulful, and emotionally immersive.',
    communication: 'Sensitive and symbolic. Needs emotional safety.',
    greenFlags: 'Compassion, creativity, and emotional attunement.',
    growthEdge: 'May blur boundaries when idealizing connection.',
    bestMatches: 'Cancer, Scorpio, Taurus, Capricorn',
  },
}

export const ZODIAC_DEEP_DIVE: Record<
  string,
  {
    emotionalNeeds: string
    intimacyStyle: string
    conflictStyle: string
    idealDateEnergy: string
  }
> = {
  Aries: {
    emotionalNeeds: 'Respect, momentum, and a partner who meets intensity with honesty.',
    intimacyStyle: 'Passionate and direct. Attraction grows through shared action and challenge.',
    conflictStyle: 'Fast and fiery, then ready to reset when clarity is reached.',
    idealDateEnergy: 'Active, bold, and spontaneous.',
  },
  Taurus: {
    emotionalNeeds: 'Safety, consistency, and trustworthy routines.',
    intimacyStyle: 'Sensual, loyal, and gradually deepening through reliability.',
    conflictStyle: 'Patient, but stubborn when boundaries or values are pushed.',
    idealDateEnergy: 'Cozy, tactile, and grounded.',
  },
  Gemini: {
    emotionalNeeds: 'Mental stimulation, playfulness, and freedom to explore ideas.',
    intimacyStyle: 'Curious and conversational. Attraction grows through shared wit and novelty.',
    conflictStyle: 'Talks things out quickly, but may shift topics when emotions get heavy.',
    idealDateEnergy: 'Light, social, and intellectually fun.',
  },
  Cancer: {
    emotionalNeeds: 'Emotional safety, reassurance, and genuine care.',
    intimacyStyle: 'Deep bonding, nurturing gestures, and trust-first vulnerability.',
    conflictStyle: 'Protective and sensitive. Needs warmth and patience to reopen.',
    idealDateEnergy: 'Tender, private, and heartfelt.',
  },
  Leo: {
    emotionalNeeds: 'Appreciation, loyalty, and emotional admiration.',
    intimacyStyle: 'Warm, affectionate, and expressive with generous romantic effort.',
    conflictStyle: 'Proud but sincere. Resolves best through respectful acknowledgment.',
    idealDateEnergy: 'Playful, glamorous, and celebratory.',
  },
  Virgo: {
    emotionalNeeds: 'Reliability, practical care, and emotional sincerity.',
    intimacyStyle: 'Detail-driven devotion. Love is shown through thoughtful consistency.',
    conflictStyle: 'Analytical and solution-focused; prefers constructive, calm repair.',
    idealDateEnergy: 'Intentional, quality-focused, and meaningful.',
  },
  Libra: {
    emotionalNeeds: 'Mutual respect, emotional harmony, and balanced partnership.',
    intimacyStyle: 'Romantic, attentive, and aesthetically minded connection.',
    conflictStyle: 'Diplomatic, but can delay tension if tone feels harsh.',
    idealDateEnergy: 'Elegant, social, and emotionally balanced.',
  },
  Scorpio: {
    emotionalNeeds: 'Trust, loyalty, and emotional depth without games.',
    intimacyStyle: 'Intense and transformative. Bonds through honesty and total presence.',
    conflictStyle: 'All-or-nothing when trust is threatened; repairs through truth and accountability.',
    idealDateEnergy: 'Private, magnetic, and emotionally deep.',
  },
  Sagittarius: {
    emotionalNeeds: 'Freedom, honesty, and shared growth.',
    intimacyStyle: 'Adventure-led bonding with authentic, unfiltered connection.',
    conflictStyle: 'Direct and blunt; needs room plus perspective to reconnect.',
    idealDateEnergy: 'Exploratory, optimistic, and expansive.',
  },
  Capricorn: {
    emotionalNeeds: 'Respect, long-term alignment, and proven reliability.',
    intimacyStyle: 'Steady commitment that deepens through earned trust.',
    conflictStyle: 'Controlled and pragmatic; prefers solutions and accountability.',
    idealDateEnergy: 'Structured, quality-driven, and purposeful.',
  },
  Aquarius: {
    emotionalNeeds: 'Authenticity, space, and intellectual equality.',
    intimacyStyle: 'Friendship-first intimacy with strong individuality.',
    conflictStyle: 'Detached at first; re-engages through logic and fairness.',
    idealDateEnergy: 'Original, unconventional, and idea-rich.',
  },
  Pisces: {
    emotionalNeeds: 'Emotional tenderness, empathy, and gentle clarity.',
    intimacyStyle: 'Soulful and imaginative. Love flows through emotional resonance.',
    conflictStyle: 'Avoidant under pressure, but deeply receptive to soft honesty.',
    idealDateEnergy: 'Dreamy, creative, and emotionally safe.',
  },
}
