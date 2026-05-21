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

// Romanian translations of PERSONALITY_DIMENSIONS. Letter codes stay
// identical to the English version (D/C/S/M/O/F/A/R) so personality
// codes like "DMFR" remain stable across languages — only the displayed
// title/meaning/opposite strings change.
export const PERSONALITY_DIMENSIONS_RO: typeof PERSONALITY_DIMENSIONS = [
  {
    letter: 'D',
    title: 'Dinamic',
    meaning: 'Energie ridicată, orientat spre acțiune, proactiv în dinamica socială și romantică.',
    opposite: 'C (Calm)',
  },
  {
    letter: 'C',
    title: 'Calm',
    meaning: 'Energie echilibrată, stil reflexiv, preferă un ritm constant și profunzime emoțională.',
    opposite: 'D (Dinamic)',
  },
  {
    letter: 'S',
    title: 'Spontan',
    meaning: 'Îi plac planurile flexibile, noutatea și deciziile de moment.',
    opposite: 'M (Măsurat)',
  },
  {
    letter: 'M',
    title: 'Măsurat',
    meaning: 'Preferă un ritm deliberat, claritate și progres bine gândit.',
    opposite: 'S (Spontan)',
  },
  {
    letter: 'O',
    title: 'Sociabil',
    meaning: 'Expresiv social, capătă energie din oameni și din interacțiunea activă.',
    opposite: 'F (Focusat)',
  },
  {
    letter: 'F',
    title: 'Focusat',
    meaning: 'Selectiv cu energia socială, preferă conexiuni mai puține, dar mai profunde.',
    opposite: 'O (Sociabil)',
  },
  {
    letter: 'A',
    title: 'Adaptabil',
    meaning: 'Confortabil cu incertitudinea; se ajustează rapid când planurile se schimbă.',
    opposite: 'R (Constant)',
  },
  {
    letter: 'R',
    title: 'Constant',
    meaning: 'Valorizează structura, consistența și siguranța emoțională previzibilă.',
    opposite: 'A (Adaptabil)',
  },
]

// Romanian translations of PERSONALITY_TYPE_GUIDE. Codes unchanged.
export const PERSONALITY_TYPE_GUIDE_RO: typeof PERSONALITY_TYPE_GUIDE = [
  { code: 'DSOA', label: 'Explorator Scânteie', summary: 'Mișcare rapidă, sociabil și flexibil. Înflorește în noutate și ritm.' },
  { code: 'DSOR', label: 'Deschizător de Drumuri', summary: 'Curajos și sociabil, dar cu o coloană solidă în relații.' },
  { code: 'DSFA', label: 'Aventurier Focusat', summary: 'Energic și spontan, cu un stil social selectiv, axat pe profunzime.' },
  { code: 'DSFR', label: 'Aprinzător Intenționat', summary: 'Energie mare și direct, dar loial structurii acolo unde contează.' },
  { code: 'DMOA', label: 'Catalizator de Viziune', summary: 'Ambițios și sociabil, cu ritm chibzuit și execuție adaptabilă.' },
  { code: 'DMOR', label: 'Strateg Fermecător', summary: 'Orientat spre oameni și încrezător; îmbină planificarea cu carisma.' },
  { code: 'DMFA', label: 'Inconformist Calibrat', summary: 'Intensitate cu sens, profunzime discretă și navigare flexibilă în viață.' },
  { code: 'DMFR', label: 'Inimă de Arhitect', summary: 'Ambițios, intenționat și loial. Construiește relații cu profunzime și structură.' },
  { code: 'CSOA', label: 'Călător Cald', summary: 'Energie blândă cu spontaneitate socială și deschidere către schimbare.' },
  { code: 'CSOR', label: 'Conector Constant', summary: 'Calm și sociabil, cu un stil relațional de încredere, care îți dă rădăcini.' },
  { code: 'CSFA', label: 'Rătăcitor Tăcut', summary: 'Reflexiv și selectiv, dar jucăuș și deschis surprizelor.' },
  { code: 'CSFR', label: 'Romantic Așezat', summary: 'Cu glas blând și intenții clare, valorizează încrederea, consistența și profunzimea emoțională.' },
  { code: 'CMOA', label: 'Diplomat Echilibrat', summary: 'Reflexiv și sociabil, preferă un ritm de calitate și o minte adaptabilă.' },
  { code: 'CMOR', label: 'Constructor de Armonie', summary: 'De încredere, axat pe oameni și stabil emoțional în relații pe termen lung.' },
  { code: 'CMFA', label: 'Creator Reflexiv', summary: 'Calm, întors spre interior și flexibil. Construiește legături puternice unu-la-unu.' },
  { code: 'CMFR', label: 'Ancoră Profundă', summary: 'Rezervat, consistent și profund loial. Fundament solid pentru o iubire stabilă.' },
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

// Romanian translations of PERSONALITY_COGNITIVE_FUNCTIONS. Function
// codes (Ni, Fe, Se, Te, etc.) stay as-is since they are technical
// labels from the personality model — only the descriptive text is
// localized.
export const PERSONALITY_COGNITIVE_FUNCTIONS_RO: typeof PERSONALITY_COGNITIVE_FUNCTIONS = {
  DSOA: {
    primary: 'Se Vision: Acționează rapid pe baza chimiei și a momentului real.',
    support: 'Fe Sync: Citește energia socială și se adaptează dinamicii de grup.',
    tertiary: 'Ne Spark: Generează idei noi de întâlnire și posibilități jucăușe.',
    shadow: 'Ti Check: Poate sări peste reflecție când se mișcă prea repede.',
  },
  DSOR: {
    primary: 'Se Vision: Acțiune încrezătoare și inițiativă romantică directă.',
    support: 'Te Structuring: Transformă atracția în planuri clare.',
    tertiary: 'Fe Warmth: Lejeritate socială și stil expresiv de conectare.',
    shadow: 'Ni Overfocus: Se poate fixa prea devreme pe rezultate.',
  },
  DSFA: {
    primary: 'Se Vision: Iubește chimia imediată și experiențele împărtășite.',
    support: 'Fi Depth: Valori interioare puternice și autenticitate emoțională.',
    tertiary: 'Ne Spark: Întorsături creative și explorare spontană.',
    shadow: 'Te Rigidity: Poate rezista structurii externe.',
  },
  DSFR: {
    primary: 'Se Vision: Condus de acțiune și prezent fizic în conexiune.',
    support: 'Si Loyalty: Construiește încredere prin consistență și ritualuri.',
    tertiary: 'Fi Depth: Deschidere emoțională selectivă.',
    shadow: 'Ne Drift: Se poate simți copleșit de prea multe opțiuni.',
  },
  DMOA: {
    primary: 'Te Structuring: Orientat spre obiective, clar și axat pe execuție.',
    support: 'Ne Spark: Extinde opțiunile și vede oportunități viitoare.',
    tertiary: 'Fe Warmth: Se implică social cu încredere.',
    shadow: 'Fi Doubt: Poate amâna exprimarea emoțională vulnerabilă.',
  },
  DMOR: {
    primary: 'Te Structuring: Organizează relațiile cu claritate și intenție.',
    support: 'Si Loyalty: Urmărire de încredere și grijă practică.',
    tertiary: 'Fe Warmth: Încredere socială cu stabilitate emoțională.',
    shadow: 'Ne Drift: Poate supra-controla incertitudinea.',
  },
  DMFA: {
    primary: 'Ni Patterning: Gânditor strategic care vede direcții mai profunde.',
    support: 'Te Structuring: Transformă intuiția în acțiune reală.',
    tertiary: 'Fi Depth: Valori interioare protejate și intimitate selectivă.',
    shadow: 'Se Overload: Se poate simți epuizat de medii haotice.',
  },
  DMFR: {
    primary: 'Ni Patterning: Citește compatibilitatea pe termen lung și traiectoria relațională.',
    support: 'Te Structuring: Creează sisteme relaționale sigure și practice.',
    tertiary: 'Fi Depth: Valorizează loialitatea, integritatea și adevărul emoțional.',
    shadow: 'Se Overload: Poate subestima spontaneitatea momentului prezent.',
  },
  CSOA: {
    primary: 'Fe Sync: Cultivă armonia socială și incluziunea emoțională.',
    support: 'Ne Spark: Curios, jucăuș și deschis ideilor în întâlniri.',
    tertiary: 'Si Loyalty: Consistență caldă în timp.',
    shadow: 'Ti Detach: Poate amâna limitele dificile.',
  },
  CSOR: {
    primary: 'Fe Sync: Centrat pe relație și atent emoțional.',
    support: 'Si Loyalty: Grijă de încredere și ritualuri relaționale constante.',
    tertiary: 'Ne Spark: Deschis aventurilor comune când încrederea e mare.',
    shadow: 'Ti Detach: Poate prioritiza pacea în defavoarea clarității.',
  },
  CSFA: {
    primary: 'Fi Depth: Valorizează autenticitatea emoțională și adevărul unu-la-unu.',
    support: 'Ne Spark: Exprimare romantică creativă.',
    tertiary: 'Si Loyalty: Stil de atașament stabil, bogat în amintiri.',
    shadow: 'Te Push: Poate evita confruntarea directă.',
  },
  CSFR: {
    primary: 'Fi Depth: Valorizează profund sinceritatea și siguranța emoțională.',
    support: 'Si Loyalty: Prezență ancorată, hrănitoare și de încredere.',
    tertiary: 'Ne Spark: Curiozitate blândă în conexiune.',
    shadow: 'Te Push: Poate avea nevoie de timp înainte de o acțiune decisivă.',
  },
  CMOA: {
    primary: 'Ti Check: Analiză reflexivă înainte de angajament.',
    support: 'Ne Spark: Se bucură de conversații bogate în idei și de noutate.',
    tertiary: 'Fe Sync: Se încălzește treptat prin înțelegere comună.',
    shadow: 'Si Stuck: Poate referenția prea mult tipare din trecut.',
  },
  CMOR: {
    primary: 'Si Loyalty: Stabilitate ca prioritate și construire de încredere în timp.',
    support: 'Te Structuring: Standarde clare și consistență practică.',
    tertiary: 'Fe Warmth: Grijă blândă cu fiabilitate socială.',
    shadow: 'Ne Drift: Poate rezista schimbării rapide.',
  },
  CMFA: {
    primary: 'Fi Depth: Condus de valori interioare și nuanțat emoțional.',
    support: 'Ni Patterning: Vede semnificația și dinamica pe termen lung.',
    tertiary: 'Se Presence: Se exprimă prin momente trăite.',
    shadow: 'Te Push: Poate sub-comunica nevoile concrete.',
  },
  CMFR: {
    primary: 'Si Loyalty: Consistent, ancorat și de încredere emoțional.',
    support: 'Fi Depth: Sinceritate emoțională discretă, dar profundă.',
    tertiary: 'Te Structuring: Sprijin practic și fiabilitate pe termen lung.',
    shadow: 'Ne Drift: Ezită în dinamici ambigue sau care se schimbă rapid.',
  },
}

// Language-aware lookup helpers. These let consumers fetch the right
// variant in one call instead of branching on appLanguage everywhere.
import type { AppLanguage } from '../domain'

export const getPersonalityDimensions = (
  language: AppLanguage,
): typeof PERSONALITY_DIMENSIONS =>
  language === 'ro' ? PERSONALITY_DIMENSIONS_RO : PERSONALITY_DIMENSIONS

export const getPersonalityTypeGuide = (
  language: AppLanguage,
): typeof PERSONALITY_TYPE_GUIDE =>
  language === 'ro' ? PERSONALITY_TYPE_GUIDE_RO : PERSONALITY_TYPE_GUIDE

export const getPersonalityCognitiveFunctions = (
  language: AppLanguage,
): typeof PERSONALITY_COGNITIVE_FUNCTIONS =>
  language === 'ro' ? PERSONALITY_COGNITIVE_FUNCTIONS_RO : PERSONALITY_COGNITIVE_FUNCTIONS
