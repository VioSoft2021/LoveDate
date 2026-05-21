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
  'Figuring it out': 'Mă caut',
  'Long-term relationship': 'Relație pe termen lung',
  'Short-term, open to long': 'Termen scurt, deschis la lung',
  'Short-term fun': 'Distracție pe termen scurt',
  'New friends': 'Prieteni noi',
  'Serious with playful energy': 'Serios, cu energie jucăușă',
}

// Lifestyle option labels (drinking, smoking, pets, children, religion,
// politics, workout, education). Used wherever profile select-option
// values display as text. The common "Prefer not to say" + edge cases
// like "Allergic" / "Trying to quit" are covered so profile detail
// stays consistent.
const LIFESTYLE_LABELS_RO: Record<string, string> = {
  // Common / shared
  'Prefer not to say': 'Prefer să nu spun',
  // DRINKING
  Often: 'Des',
  Socially: 'Social',
  Rarely: 'Rar',
  Never: 'Niciodată',
  Sober: 'Sobru',
  // SMOKING
  'Trying to quit': 'Încerc să mă las',
  // PETS
  'Have a dog': 'Am un câine',
  'Have a cat': 'Am o pisică',
  'Have other pets': 'Am alte animale',
  'Want pets': 'Vreau animale',
  'No pets': 'Fără animale',
  Allergic: 'Alergic',
  // CHILDREN
  'Have kids': 'Am copii',
  'Want kids': 'Vreau copii',
  "Don't want kids": 'Nu vreau copii',
  'Open to kids': 'Deschis la copii',
  // RELIGION
  Spiritual: 'Spiritual',
  Religious: 'Religios',
  'Not religious': 'Nereligios',
  Agnostic: 'Agnostic',
  Atheist: 'Ateu',
  // POLITICS
  Liberal: 'Liberal',
  Conservative: 'Conservator',
  Moderate: 'Moderat',
  Apolitical: 'Apolitic',
  // WORKOUT
  Daily: 'Zilnic',
  Weekly: 'Săptămânal',
  'Now and then': 'Din când în când',
  // EDUCATION
  'High school': 'Liceu',
  'Some college': 'Studii universitare începute',
  Bachelors: 'Licență',
  Masters: 'Master',
  PhD: 'Doctorat',
  Other: 'Altele',
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
