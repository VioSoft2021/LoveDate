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

// Romanian translations of ZODIAC_DESCRIPTIONS. Zodiac sign keys are
// kept in English (Aries, Taurus...) because they're used as data
// identifiers throughout the app. The DISPLAYED sign name in RO is
// handled separately by zodiac-name translation helpers.
export const ZODIAC_DESCRIPTIONS_RO: typeof ZODIAC_DESCRIPTIONS = {
  Aries: {
    overview: 'Inițiator curajos cu impuls pasional. Berbecul se mișcă rapid când chimia se simte reală.',
    loveStyle: 'Direct, jucăuș și orientat spre acțiune. Iubește întâlnirile vii și aventuroase.',
    communication: 'Sincer și imediat. Preferă claritatea în locul semnalelor amestecate.',
    greenFlags: 'Curaj, loialitate în conflict și disponibilitate de a apărea rapid.',
    growthEdge: 'Poate grăbi ritmul emoțional înainte de stabilirea unei alinieri mai profunde.',
    bestMatches: 'Leu, Săgetător, Gemeni, Vărsător, Balanță',
  },
  Taurus: {
    overview: 'Senzual constant care construiește iubirea prin consistență, atingere și încredere.',
    loveStyle: 'Cu ardere lentă și devotat. Investește profund odată ce siguranța e stabilită.',
    communication: 'Ancorat și practic. Apreciază fiabilitatea în vorbe și fapte.',
    greenFlags: 'Stabilitate emoțională, răbdare și urmărire de încredere.',
    growthEdge: 'Poate rezista schimbării sau se poate agăța prea mult de confort.',
    bestMatches: 'Fecioară, Capricorn, Rac, Pești',
  },
  Gemini: {
    overview: 'Conector curios care leagă prin idei, umor și scânteie mentală.',
    loveStyle: 'Jucăuș, sociabil și în căutare de noutate. Înflorește în conversații dinamice.',
    communication: 'Rapid, expresiv și spiritual. Iubește dialogul receptiv.',
    greenFlags: 'Deschidere mentală, adaptabilitate și inteligență socială.',
    growthEdge: 'Se poate lupta cu consistența emoțională când se plictisește.',
    bestMatches: 'Balanță, Vărsător, Berbec, Leu',
  },
  Cancer: {
    overview: 'Inimă protectoare, cu intuiție emoțională puternică și instincte de grijă.',
    loveStyle: 'Hrănitor, orientat spre atașament și profund sentimental.',
    communication: 'Întâi emoția, apoi cuvintele. Citește tonul și intenția cu atenție.',
    greenFlags: 'Loialitate, compasiune și dedicare relațională.',
    growthEdge: 'Se poate retrage sau pune scuturi când simte că nu e în siguranță.',
    bestMatches: 'Scorpion, Pești, Taur, Fecioară',
  },
  Leo: {
    overview: 'Cel care îți dăruiește lumina reflectoarelor — iubește romantismul expresiv și conexiunea încrezătoare.',
    loveStyle: 'Generos, loial și afectuos. Se bucură de aprecierea vizibilă.',
    communication: 'Deschis și carismatic. Răspunde bine la admirația sinceră.',
    greenFlags: 'Devotament cu suflet mare, instinct protector și consistență în afecțiune.',
    growthEdge: 'Poate supra-investi în validare când se simte invizibil.',
    bestMatches: 'Berbec, Săgetător, Gemeni, Balanță',
  },
  Virgo: {
    overview: 'Partener intenționat care își exprimă iubirea prin grijă, precizie și efort.',
    loveStyle: 'Devotament practic. Construiește încredere prin detalii care contează.',
    communication: 'Clar, chibzuit și orientat spre soluții.',
    greenFlags: 'Fiabilitate, responsabilitate emoțională și standarde solide.',
    growthEdge: 'Poate supra-analiza sau deveni prea autocritic.',
    bestMatches: 'Taur, Capricorn, Rac, Scorpion',
  },
  Libra: {
    overview: 'Căutător de armonie care valorizează echilibrul emoțional, estetica și reciprocitatea.',
    loveStyle: 'Romantic, grațios social și axat pe parteneriat.',
    communication: 'Diplomatic și relațional. Preferă tonul colaborativ.',
    greenFlags: 'Corectitudine, farmec și angajament pentru respect reciproc.',
    growthEdge: 'Poate amâna decizii dificile pentru a evita conflictul.',
    bestMatches: 'Gemeni, Vărsător, Leu, Săgetător',
  },
  Scorpio: {
    overview: 'Semnul intensității și al profunzimii. Leagă prin încredere, loialitate și adevăr emoțional.',
    loveStyle: 'Atașament total cu energie protectoare și transformatoare puternică.',
    communication: 'Privat, dar pătrunzător de sincer odată ce încrederea e construită.',
    greenFlags: 'Curaj emoțional, loialitate și angajament profund.',
    growthEdge: 'Poate deveni reticent sau controlant în incertitudine.',
    bestMatches: 'Rac, Pești, Fecioară, Capricorn',
  },
  Sagittarius: {
    overview: 'Explorator iubitor de libertate cu energie de întâlnire optimistă și curioasă.',
    loveStyle: 'Înclinat spre aventură și sincer. Are nevoie de spațiu și de creștere comună.',
    communication: 'Direct, candid și orientat spre viitor.',
    greenFlags: 'Autenticitate, pozitivitate și deschidere către explorare.',
    growthEdge: 'Poate evita greutatea emoțională dacă ritmul îi pare restrictiv.',
    bestMatches: 'Berbec, Leu, Balanță, Vărsător',
  },
  Capricorn: {
    overview: 'Constructor ancorat care ia angajamentul în serios și planifică pe termen lung.',
    loveStyle: 'Stabil, intenționat și centrat pe loialitate.',
    communication: 'Măsurat și practic. Preferă substanța în locul dramei.',
    greenFlags: 'Fiabilitate, ambiție și responsabilitate relațională puternică.',
    growthEdge: 'Poate părea rezervat emoțional în etapele timpurii.',
    bestMatches: 'Taur, Fecioară, Scorpion, Pești',
  },
  Aquarius: {
    overview: 'Vizionar independent care caută autenticitate, idei și libertate reciprocă.',
    loveStyle: 'Intimitate condusă de prietenie cu individualitate puternică.',
    communication: 'Conceptual, deschis la minte și cu privirea în viitor.',
    greenFlags: 'Respect pentru limite, originalitate și onestitate intelectuală.',
    growthEdge: 'Poate intelectualiza emoțiile în loc să le simtă deplin.',
    bestMatches: 'Gemeni, Balanță, Săgetător, Berbec',
  },
  Pisces: {
    overview: 'Visător empatic cu intuiție bogată și imaginație romantică.',
    loveStyle: 'Tandru, profund și imersiv emoțional.',
    communication: 'Sensibil și simbolic. Are nevoie de siguranță emoțională.',
    greenFlags: 'Compasiune, creativitate și acordare emoțională.',
    growthEdge: 'Poate estompa limitele când idealizează conexiunea.',
    bestMatches: 'Rac, Scorpion, Taur, Capricorn',
  },
}

// Romanian translations of ZODIAC_DEEP_DIVE.
export const ZODIAC_DEEP_DIVE_RO: typeof ZODIAC_DEEP_DIVE = {
  Aries: {
    emotionalNeeds: 'Respect, ritm și un partener care întâmpină intensitatea cu sinceritate.',
    intimacyStyle: 'Pasional și direct. Atracția crește prin acțiune comună și provocare.',
    conflictStyle: 'Rapid și aprins, apoi gata să resetezi când ajungeți la claritate.',
    idealDateEnergy: 'Activ, îndrăzneț și spontan.',
  },
  Taurus: {
    emotionalNeeds: 'Siguranță, consistență și ritualuri de încredere.',
    intimacyStyle: 'Senzual, loial și adâncindu-se treptat prin fiabilitate.',
    conflictStyle: 'Răbdător, dar încăpățânat când limitele sau valorile sunt împinse.',
    idealDateEnergy: 'Cald, tactil și ancorat.',
  },
  Gemini: {
    emotionalNeeds: 'Stimulare mentală, joacă și libertate de a explora idei.',
    intimacyStyle: 'Curios și conversațional. Atracția crește prin spirit comun și noutate.',
    conflictStyle: 'Discută rapid lucrurile, dar poate schimba subiectul când emoțiile devin grele.',
    idealDateEnergy: 'Ușor, social și intelectual amuzant.',
  },
  Cancer: {
    emotionalNeeds: 'Siguranță emoțională, asigurări și grijă autentică.',
    intimacyStyle: 'Legătură profundă, gesturi hrănitoare și vulnerabilitate bazată pe încredere.',
    conflictStyle: 'Protector și sensibil. Are nevoie de căldură și răbdare pentru a se redeschide.',
    idealDateEnergy: 'Tandru, privat și plin de inimă.',
  },
  Leo: {
    emotionalNeeds: 'Apreciere, loialitate și admirație emoțională.',
    intimacyStyle: 'Cald, afectuos și expresiv, cu efort romantic generos.',
    conflictStyle: 'Mândru, dar sincer. Se rezolvă cel mai bine prin recunoaștere respectuoasă.',
    idealDateEnergy: 'Jucăuș, glamuros și de sărbătoare.',
  },
  Virgo: {
    emotionalNeeds: 'Fiabilitate, grijă practică și sinceritate emoțională.',
    intimacyStyle: 'Devotament axat pe detalii. Iubirea se arată prin consistență chibzuită.',
    conflictStyle: 'Analitic și orientat spre soluții; preferă reparația calmă și constructivă.',
    idealDateEnergy: 'Intenționat, axat pe calitate și plin de sens.',
  },
  Libra: {
    emotionalNeeds: 'Respect reciproc, armonie emoțională și parteneriat echilibrat.',
    intimacyStyle: 'Conexiune romantică, atentă și estetică.',
    conflictStyle: 'Diplomatic, dar poate amâna tensiunea dacă tonul pare aspru.',
    idealDateEnergy: 'Elegant, social și echilibrat emoțional.',
  },
  Scorpio: {
    emotionalNeeds: 'Încredere, loialitate și profunzime emoțională fără jocuri.',
    intimacyStyle: 'Intens și transformator. Leagă prin sinceritate și prezență totală.',
    conflictStyle: 'Totul-sau-nimic când încrederea e amenințată; reparare prin adevăr și asumare.',
    idealDateEnergy: 'Privat, magnetic și profund emoțional.',
  },
  Sagittarius: {
    emotionalNeeds: 'Libertate, onestitate și creștere comună.',
    intimacyStyle: 'Legătură condusă de aventură, cu conexiune autentică, nefiltrată.',
    conflictStyle: 'Direct și fără ocolișuri; are nevoie de spațiu plus perspectivă pentru a se reconecta.',
    idealDateEnergy: 'Exploratoriu, optimist și expansiv.',
  },
  Capricorn: {
    emotionalNeeds: 'Respect, aliniere pe termen lung și fiabilitate dovedită.',
    intimacyStyle: 'Angajament constant care se adâncește prin încredere câștigată.',
    conflictStyle: 'Controlat și pragmatic; preferă soluții și asumare.',
    idealDateEnergy: 'Structurat, axat pe calitate și cu scop.',
  },
  Aquarius: {
    emotionalNeeds: 'Autenticitate, spațiu și egalitate intelectuală.',
    intimacyStyle: 'Intimitate cu prietenia pe primul loc și individualitate puternică.',
    conflictStyle: 'Detașat la început; se reconectează prin logică și corectitudine.',
    idealDateEnergy: 'Original, neconvențional și bogat în idei.',
  },
  Pisces: {
    emotionalNeeds: 'Tandrețe emoțională, empatie și claritate blândă.',
    intimacyStyle: 'Profund și plin de imaginație. Iubirea curge prin rezonanță emoțională.',
    conflictStyle: 'Evitant sub presiune, dar profund receptiv la onestitatea blândă.',
    idealDateEnergy: 'Visător, creativ și sigur emoțional.',
  },
}

// Language-aware lookup helpers.
import type { AppLanguage } from '../domain'

export const getZodiacDescription = (sign: string, language: AppLanguage) =>
  language === 'ro' ? ZODIAC_DESCRIPTIONS_RO[sign] : ZODIAC_DESCRIPTIONS[sign]

export const getZodiacDeepDive = (sign: string, language: AppLanguage) =>
  language === 'ro' ? ZODIAC_DEEP_DIVE_RO[sign] : ZODIAC_DEEP_DIVE[sign]
