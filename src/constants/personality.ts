export const PERSONALITY_DIMENSIONS: Array<{
  letter: string
  title: string
  meaning: string
  opposite: string
}> = [
  {
    letter: 'D',
    title: 'Dynamic',
    meaning: 'High energy, action-first, proactive in social and romantic momentum.',
    opposite: 'C (Calm)',
  },
  {
    letter: 'C',
    title: 'Calm',
    meaning: 'Grounded energy, reflective style, prefers steadier pace and emotional depth.',
    opposite: 'D (Dynamic)',
  },
  {
    letter: 'S',
    title: 'Spontaneous',
    meaning: 'Enjoys flexible plans, novelty, and in-the-moment decisions.',
    opposite: 'M (Measured)',
  },
  {
    letter: 'M',
    title: 'Measured',
    meaning: 'Likes deliberate pacing, clarity, and thoughtful progression.',
    opposite: 'S (Spontaneous)',
  },
  {
    letter: 'O',
    title: 'Outgoing',
    meaning: 'Socially expressive, gains energy from people and active interaction.',
    opposite: 'F (Focused)',
  },
  {
    letter: 'F',
    title: 'Focused',
    meaning: 'Selective with social energy, prefers fewer but deeper connections.',
    opposite: 'O (Outgoing)',
  },
  {
    letter: 'A',
    title: 'Adaptive',
    meaning: 'Comfortable with uncertainty, adjusts quickly when plans shift.',
    opposite: 'R (Reliable)',
  },
  {
    letter: 'R',
    title: 'Reliable',
    meaning: 'Values structure, consistency, and predictable emotional safety.',
    opposite: 'A (Adaptive)',
  },
]

export const PERSONALITY_TYPE_GUIDE: Array<{
  code: string
  label: string
  summary: string
}> = [
  { code: 'DSOA', label: 'Spark Explorer', summary: 'Fast-moving, social, and flexible. Thrives on novelty and momentum.' },
  { code: 'DSOR', label: 'Social Trailblazer', summary: 'Bold and outgoing, but with a dependable backbone in relationships.' },
  { code: 'DSFA', label: 'Focused Adventurer', summary: 'Energetic and spontaneous with a selective, depth-first social style.' },
  { code: 'DSFR', label: 'Intentional Firestarter', summary: 'High-energy and direct, yet loyal to structure where it matters.' },
  { code: 'DMOA', label: 'Vision Catalyst', summary: 'Driven and social with thoughtful pacing and adaptable execution.' },
  { code: 'DMOR', label: 'Strategic Charmer', summary: 'People-oriented and confident, blending planning with charisma.' },
  { code: 'DMFA', label: 'Calibrated Maverick', summary: 'Purposeful intensity, private depth, and flexible life navigation.' },
  { code: 'DMFR', label: 'Architect Heart', summary: 'Ambitious, intentional, and loyal. Builds relationships with depth and structure.' },
  { code: 'CSOA', label: 'Warm Voyager', summary: 'Gentle energy with social spontaneity and openness to change.' },
  { code: 'CSOR', label: 'Steady Connector', summary: 'Calm and social with a dependable, grounding relationship style.' },
  { code: 'CSFA', label: 'Quiet Wanderer', summary: 'Reflective and selective, but playful and open to surprises.' },
  { code: 'CSFR', label: 'Grounded Romantic', summary: 'Soft-spoken and intentional, values trust, consistency, and emotional depth.' },
  { code: 'CMOA', label: 'Balanced Diplomat', summary: 'Thoughtful and social, prefers quality pacing with adaptive mindset.' },
  { code: 'CMOR', label: 'Harmony Builder', summary: 'Reliable, people-centered, and emotionally steady in long-term dynamics.' },
  { code: 'CMFA', label: 'Reflective Creator', summary: 'Calm, inward-focused, and flexible. Builds strong one-to-one bonds.' },
  { code: 'CMFR', label: 'Deep Anchor', summary: 'Reserved, consistent, and deeply loyal. Strong foundation for stable love.' },
]

export const PERSONALITY_COGNITIVE_FUNCTIONS: Record<
  string,
  { primary: string; support: string; tertiary: string; shadow: string }
> = {
  DSOA: {
    primary: 'Se Vision: Acts quickly on chemistry and real-world momentum.',
    support: 'Fe Sync: Reads social energy and adapts to group dynamics.',
    tertiary: 'Ne Spark: Generates new date ideas and playful possibilities.',
    shadow: 'Ti Check: Can skip reflection when moving too fast.',
  },
  DSOR: {
    primary: 'Se Vision: Confident action and direct romantic initiative.',
    support: 'Te Structuring: Turns attraction into clear plans.',
    tertiary: 'Fe Warmth: Social ease and expressive connection style.',
    shadow: 'Ni Overfocus: May lock on outcomes too early.',
  },
  DSFA: {
    primary: 'Se Vision: Loves immediate chemistry and shared experiences.',
    support: 'Fi Depth: Strong private values and emotional authenticity.',
    tertiary: 'Ne Spark: Creative twists and spontaneous exploration.',
    shadow: 'Te Rigidity: Can resist external structure.',
  },
  DSFR: {
    primary: 'Se Vision: Action-led and physically present in connection.',
    support: 'Si Loyalty: Builds trust through consistency and routines.',
    tertiary: 'Fi Depth: Selective emotional openness.',
    shadow: 'Ne Drift: May feel stretched by too many options.',
  },
  DMOA: {
    primary: 'Te Structuring: Goal-oriented, clear, and execution-focused.',
    support: 'Ne Spark: Expands options and sees future opportunities.',
    tertiary: 'Fe Warmth: Engages socially with confidence.',
    shadow: 'Fi Doubt: Can postpone vulnerable emotional expression.',
  },
  DMOR: {
    primary: 'Te Structuring: Organizes relationships with clarity and intent.',
    support: 'Si Loyalty: Reliable follow-through and practical care.',
    tertiary: 'Fe Warmth: Social confidence with emotional steadiness.',
    shadow: 'Ne Drift: May over-control uncertainty.',
  },
  DMFA: {
    primary: 'Ni Patterning: Strategic thinker who sees deeper direction.',
    support: 'Te Structuring: Turns insight into real action.',
    tertiary: 'Fi Depth: Protective inner values and selective intimacy.',
    shadow: 'Se Overload: Can feel drained by chaotic environments.',
  },
  DMFR: {
    primary: 'Ni Patterning: Reads long-term compatibility and relational trajectory.',
    support: 'Te Structuring: Creates secure, practical relationship systems.',
    tertiary: 'Fi Depth: Values loyalty, integrity, and emotional truth.',
    shadow: 'Se Overload: May underplay present-moment spontaneity.',
  },
  CSOA: {
    primary: 'Fe Sync: Nurtures social harmony and emotional inclusion.',
    support: 'Ne Spark: Curious, playful, and idea-open in dating.',
    tertiary: 'Si Loyalty: Warm consistency over time.',
    shadow: 'Ti Detach: Can delay hard boundaries.',
  },
  CSOR: {
    primary: 'Fe Sync: Relationship-centered and emotionally attentive.',
    support: 'Si Loyalty: Reliable care and steady relational rituals.',
    tertiary: 'Ne Spark: Open to shared adventures when trust is high.',
    shadow: 'Ti Detach: May over-prioritize peace over clarity.',
  },
  CSFA: {
    primary: 'Fi Depth: Values emotional authenticity and one-to-one truth.',
    support: 'Ne Spark: Creative romantic expression.',
    tertiary: 'Si Loyalty: Stable, memory-rich attachment style.',
    shadow: 'Te Push: Can avoid direct confrontation.',
  },
  CSFR: {
    primary: 'Fi Depth: Deeply values sincerity and emotional safety.',
    support: 'Si Loyalty: Grounded, nurturing, and dependable presence.',
    tertiary: 'Ne Spark: Gentle curiosity in connection.',
    shadow: 'Te Push: May need time before decisive action.',
  },
  CMOA: {
    primary: 'Ti Check: Reflective analysis before commitment.',
    support: 'Ne Spark: Enjoys idea-rich conversations and novelty.',
    tertiary: 'Fe Sync: Warms gradually through shared understanding.',
    shadow: 'Si Stuck: Can over-reference past patterns.',
  },
  CMOR: {
    primary: 'Si Loyalty: Stability-first and trust-building over time.',
    support: 'Te Structuring: Clear standards and practical consistency.',
    tertiary: 'Fe Warmth: Gentle care with social reliability.',
    shadow: 'Ne Drift: May resist rapid change.',
  },
  CMFA: {
    primary: 'Fi Depth: Inner-value led and emotionally nuanced.',
    support: 'Ni Patterning: Sees meaning and long-range dynamics.',
    tertiary: 'Se Presence: Expresses through lived moments.',
    shadow: 'Te Push: Can under-communicate concrete needs.',
  },
  CMFR: {
    primary: 'Si Loyalty: Consistent, grounded, and emotionally dependable.',
    support: 'Fi Depth: Quiet but profound emotional sincerity.',
    tertiary: 'Te Structuring: Practical support and long-term reliability.',
    shadow: 'Ne Drift: Hesitates with ambiguous or rapidly changing dynamics.',
  },
}
