import type { AppLanguage } from '../domain'

const INTEREST_LABELS_RO: Record<string, string> = {
  Design: 'Design',
  UX: 'UX',
  Creativity: 'Creativitate',
  Travel: 'Călătorii',
  Coffee: 'Cafea',
  Tea: 'Ceai',
  Wine: 'Vin',
  Beer: 'Bere',
  Cooking: 'Gătit',
  Baking: 'Patiserie',
  Food: 'Mâncare',
  Fitness: 'Fitness',
  Yoga: 'Yoga',
  Pilates: 'Pilates',
  Running: 'Alergare',
  Hiking: 'Drumeții',
  Climbing: 'Escaladă',
  Cycling: 'Ciclism',
  Swimming: 'Înot',
  Surfing: 'Surf',
  Skiing: 'Schi',
  Snowboarding: 'Snowboard',
  Tennis: 'Tenis',
  Football: 'Fotbal',
  Basketball: 'Baschet',
  Sports: 'Sport',
  Music: 'Muzică',
  'Live music': 'Muzică live',
  Concerts: 'Concerte',
  Festivals: 'Festivaluri',
  Singing: 'Cântat',
  Guitar: 'Chitară',
  Piano: 'Pian',
  Dancing: 'Dans',
  Photography: 'Fotografie',
  Art: 'Artă',
  Painting: 'Pictură',
  Drawing: 'Desen',
  Reading: 'Citit',
  Books: 'Cărți',
  Writing: 'Scris',
  Poetry: 'Poezie',
  Movies: 'Filme',
  Cinema: 'Cinema',
  TV: 'Seriale',
  Gaming: 'Gaming',
  Boardgames: 'Jocuri de masă',
  Coding: 'Programare',
  Technology: 'Tehnologie',
  Startups: 'Startup-uri',
  Science: 'Știință',
  History: 'Istorie',
  Philosophy: 'Filozofie',
  Politics: 'Politică',
  Volunteering: 'Voluntariat',
  Meditation: 'Meditație',
  Mindfulness: 'Conștientizare',
  Nature: 'Natură',
  Camping: 'Camping',
  Beach: 'Plajă',
  Dogs: 'Câini',
  Cats: 'Pisici',
  Pets: 'Animale de companie',
  Fashion: 'Modă',
  Cars: 'Mașini',
  Motorcycles: 'Motociclete',
  DIY: 'DIY',
  Gardening: 'Grădinărit',
  'Board games': 'Jocuri de masă',
  Theater: 'Teatru',
  Museums: 'Muzee',
  Galleries: 'Galerii',
  Architecture: 'Arhitectură',
  'Road trips': 'Excursii cu mașina',
  Backpacking: 'Backpacking',
  Languages: 'Limbi străine',
  Foodie: 'Gurmand',
  Brunch: 'Brunch',
  Cocktails: 'Cocktailuri',
}

const RELATIONSHIP_INTENT_LABELS_RO: Record<string, string> = {
  'Long-term': 'Pe termen lung',
  'Short-term': 'Pe termen scurt',
  Friends: 'Prietenie',
  'Figuring it out': 'Mă mai gândesc',
  'Long-term relationship': 'Relație pe termen lung',
  'Short-term, open to long': 'Termen scurt, deschis la lung',
  'Short-term fun': 'Distracție pe termen scurt',
  'New friends': 'Prieteni noi',
  'Serious with playful energy': 'Serios, cu energie jucăușă',
}

// Lifestyle / profile option labels — every select-option value the
// app renders as text. Single map covers gender, orientation, pronouns,
// looking-for, drinking, smoking, workout, pets, children, religion,
// politics, and the common "Prefer not to say" / "Other" fallbacks.
// Source-of-truth lists live in src/constants/profile.ts.
const LIFESTYLE_LABELS_RO: Record<string, string> = {
  // ── Shared fallbacks ─────────────────────────────────────────────
  'Prefer not to say': 'Prefer să nu spun',
  Other: 'Altele',
  Never: 'Niciodată',

  // ── GENDER (Woman, Man, Non-binary) ──────────────────────────────
  Woman: 'Femeie',
  Man: 'Bărbat',
  'Non-binary': 'Non-binar',

  // ── PRONOUNS (She/Her, He/Him, They/Them, She/They, He/They, Other)
  'She/Her': 'Ea/A ei',
  'He/Him': 'El/Al lui',
  'They/Them': 'Ei/Lor',
  'She/They': 'Ea/Ei',
  'He/They': 'El/Ei',

  // ── ORIENTATION ──────────────────────────────────────────────────
  Straight: 'Heterosexual(ă)',
  Gay: 'Gay',
  Lesbian: 'Lesbiană',
  Bisexual: 'Bisexual(ă)',
  Pansexual: 'Pansexual(ă)',
  Asexual: 'Asexual(ă)',
  Queer: 'Queer',
  Open: 'Deschis(ă)',

  // ── DRINKING (Never, Rarely, Socially, Often, Prefer not to say) ─
  Rarely: 'Rar',
  Socially: 'Social',
  Often: 'Des',
  Sober: 'Sobru',

  // ── SMOKING (Regularly, Trying to quit) ──────────────────────────
  Regularly: 'Regulat',
  'Trying to quit': 'Încerc să mă las',

  // ── WORKOUT (Sometimes, 1-2x per week, 3x per week, 4-5x per week, Daily)
  Sometimes: 'Uneori',
  '1-2x per week': 'De 1-2 ori pe săptămână',
  '3x per week': 'De 3 ori pe săptămână',
  '4-5x per week': 'De 4-5 ori pe săptămână',
  Daily: 'Zilnic',
  Weekly: 'Săptămânal',
  'Now and then': 'Din când în când',

  // ── PETS (Dog person, Cat person, Both, Allergic, Want one) ──────
  'Dog person': 'Iubitor de câini',
  'Cat person': 'Iubitor de pisici',
  Both: 'Ambele',
  Allergic: 'Alergic',
  'Want one': 'Vreau unul',

  // ── CHILDREN_PLAN ────────────────────────────────────────────────
  'Want someday': 'Vreau cândva',
  'Maybe someday': 'Poate cândva',
  'Don’t want': 'Nu vreau',
  'Have and want more': 'Am și mai vreau',
  'Have, don’t want more': 'Am, nu mai vreau',
  // ASCII apostrophe fallbacks in case data uses straight apostrophes
  "Don't want": 'Nu vreau',
  "Have, don't want more": 'Am, nu mai vreau',

  // ── RELIGION ─────────────────────────────────────────────────────
  Agnostic: 'Agnostic',
  Atheist: 'Ateu',
  Buddhist: 'Budist',
  Christian: 'Creștin',
  Hindu: 'Hindus',
  Jewish: 'Evreu',
  Muslim: 'Musulman',
  Spiritual: 'Spiritual',
  Religious: 'Religios',
  'Not religious': 'Nereligios',

  // ── POLITICS ─────────────────────────────────────────────────────
  Liberal: 'Liberal',
  Moderate: 'Moderat',
  Conservative: 'Conservator',
  Apolitical: 'Apolitic',

  // ── EDUCATION (in case data table grows) ─────────────────────────
  'High school': 'Liceu',
  'Some college': 'Studii universitare începute',
  Bachelors: 'Licență',
  Masters: 'Master',
  PhD: 'Doctorat',

  // ── LOOKING FOR (mirror RELATIONSHIP_INTENT_LABELS_RO here so
  //    translateLifestyleOption covers the LOOKING_FOR_OPTIONS list too;
  //    that dropdown stores the LONG values, not the short ones). ──
  'Long-term': 'Pe termen lung',
  'Short-term': 'Pe termen scurt',
  Friends: 'Prietenie',
  'Figuring it out': 'Mă mai gândesc',
  // Full LOOKING_FOR_OPTIONS values (src/constants/profile.ts:107-113)
  'Long-term relationship': 'Relație pe termen lung',
  'Short-term, open to long': 'Termen scurt, deschis la lung',
  'Short-term fun': 'Distracție pe termen scurt',
  'New friends': 'Prieteni noi',
}

// Safety report categories (src/services/moderation.ts). Each value is
// a lowercase identifier (spam, scam, harassment, hate, nudity, underage,
// impersonation, other). The UI capitalizes the first letter for
// display, so the keys here match the lowercase form.
const SAFETY_CATEGORY_LABELS_RO: Record<string, string> = {
  spam: 'Spam',
  scam: 'Înșelătorie',
  harassment: 'Hărțuire',
  hate: 'Ură / discriminare',
  nudity: 'Nuditate',
  underage: 'Minor',
  impersonation: 'Furt de identitate',
  other: 'Altele',
}
const SAFETY_CATEGORY_LABELS_EN: Record<string, string> = {
  spam: 'Spam',
  scam: 'Scam',
  harassment: 'Harassment',
  hate: 'Hate',
  nudity: 'Nudity',
  underage: 'Underage',
  impersonation: 'Impersonation',
  other: 'Other',
}

export const translateSafetyCategory = (
  category: string,
  language: AppLanguage,
): string => {
  const map = language === 'ro' ? SAFETY_CATEGORY_LABELS_RO : SAFETY_CATEGORY_LABELS_EN
  return map[category] ?? (category.charAt(0).toUpperCase() + category.slice(1))
}

export const translateInterest = (label: string, language: AppLanguage): string => {
  if (language !== 'ro') return label
  return INTEREST_LABELS_RO[label] ?? INTEREST_LABELS_RO[label.trim()] ?? label
}

export const translateRelationshipIntent = (label: string, language: AppLanguage): string => {
  if (language !== 'ro') return label
  return RELATIONSHIP_INTENT_LABELS_RO[label] ?? label
}

// Translates lifestyle option values (drinking, smoking, pets, children,
// religion, politics, workout, education). Falls back to the original
// English label if no translation exists.
export const translateLifestyleOption = (label: string, language: AppLanguage): string => {
  if (language !== 'ro') return label
  return LIFESTYLE_LABELS_RO[label] ?? LIFESTYLE_LABELS_RO[label.trim()] ?? label
}

export const translateInterestForSentence = (label: string, language: AppLanguage): string => {
  const out = translateInterest(label, language)
  if (language === 'ro') return out.toLowerCase()
  return out.toLowerCase()
}
