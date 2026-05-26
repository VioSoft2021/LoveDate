import type { Profile } from '../priveApi'
import type { ChatMessage, SelfProfile } from '../../domain'
import { EMPTY_SELF_PROFILE } from '../../constants'

/**
 * Demo profiles for Guest Tour mode (Phase 1 — 2026-05-26).
 *
 * When a visitor enters the app via the "Take a Tour" gate on the
 * landing hero, every backend fetch is intercepted and answered from
 * this fixture instead. No anonymous Supabase user is created, no
 * real Privé users are exposed, and the guest's swipes / likes /
 * messages persist only in local React state until they refresh.
 *
 * Design notes:
 * - Plausible names + Romanian cities so the deck feels regional and
 *   real, but every card carries a `Demo` chip in the UI so there's
 *   never a chance of mistaking a synthetic profile for a real user.
 * - Tier A fields (bigFive + attachmentStyle) populated on every
 *   profile so the Personality Fit % and Pair Dynamic surfaces have
 *   data to work with end-to-end.
 * - The first two profiles (Andra, Mateo) are flagged as "pre-matched"
 *   in Phase 2 so the guest opens to one or two existing chats and
 *   can experience the full conversation surface.
 * - Photos are pulled from Unsplash's editorial pool with the same
 *   high-res params the production app uses. Identical visual quality
 *   to a real Privé profile.
 */

const unsplash = (id: string): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=85`

export const DEMO_PROFILES: Profile[] = [
  {
    id: 90001,
    authUserId: null,
    name: 'Andra',
    age: 29,
    city: 'București',
    vibe: 'Quiet bookshop crawler',
    bio: 'Architect by day, plays piano by candlelight. Believes the right book at the right time saves a life.',
    interests: ['Architecture', 'Piano', 'Slow mornings', 'Cinema', 'Poetry'],
    palette: ['#1f1a36', '#3d3157'],
    photos: [
      unsplash('photo-1487412720507-e7ab37603c6f'),
      unsplash('photo-1517841905240-472988babdf9'),
      unsplash('photo-1488426862026-3ee34a7d66df'),
    ],
    gender: 'Woman',
    distanceKm: 4,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Virgo',
    bigFive: { openness: 78, conscientiousness: 72, extraversion: 38, agreeableness: 74, neuroticism: 32 },
    attachmentStyle: 'secure',
  },
  {
    id: 90002,
    authUserId: null,
    name: 'Mateo',
    age: 34,
    city: 'București',
    vibe: 'Espresso & blueprints',
    bio: 'Product lead. Half my weekends are spent renovating a tiny apartment in Cotroceni. The other half: hiking the Făgăraș.',
    interests: ['Design', 'Espresso', 'Hiking', 'Carpentry', 'Bauhaus'],
    palette: ['#172238', '#2b3b5d'],
    photos: [
      unsplash('photo-1500648767791-00dcc994a43e'),
      unsplash('photo-1506277886164-e25aa3f4ef7f'),
      unsplash('photo-1504593811423-6dd665756598'),
    ],
    gender: 'Man',
    distanceKm: 6,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Capricorn',
    bigFive: { openness: 70, conscientiousness: 82, extraversion: 56, agreeableness: 64, neuroticism: 28 },
    attachmentStyle: 'secure',
  },
  {
    id: 90003,
    authUserId: null,
    name: 'Iulia',
    age: 26,
    city: 'Cluj-Napoca',
    vibe: 'Documentary photographer',
    bio: 'I photograph people who have stopped pretending. Currently working on a series about Transylvanian shepherds.',
    interests: ['Photography', 'Documentary', 'Mountains', 'Vinyl', 'Wine'],
    palette: ['#2a1f33', '#4a3554'],
    photos: [
      unsplash('photo-1524504388940-b1c1722653e1'),
      unsplash('photo-1494790108377-be9c29b29330'),
      unsplash('photo-1521572267360-ee0c2909d518'),
    ],
    gender: 'Woman',
    distanceKm: 12,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Scorpio',
    bigFive: { openness: 88, conscientiousness: 58, extraversion: 42, agreeableness: 68, neuroticism: 48 },
    attachmentStyle: 'anxious',
  },
  {
    id: 90004,
    authUserId: null,
    name: 'Radu',
    age: 38,
    city: 'Timișoara',
    vibe: 'Trail runner & quiet thinker',
    bio: 'Run long distances to think. Engineer by training, novelist by stubbornness. Two unpublished manuscripts and counting.',
    interests: ['Trail running', 'Writing', 'Philosophy', 'Chess', 'Tea ceremony'],
    palette: ['#1a2734', '#314556'],
    photos: [
      unsplash('photo-1507003211169-0a1dd7228f2d'),
      unsplash('photo-1504257432389-52343af06ae3'),
      unsplash('photo-1541534401786-2077eed87a72'),
    ],
    gender: 'Man',
    distanceKm: 18,
    verified: false,
    relationshipGoal: 'Long-term',
    zodiac: 'Aquarius',
    bigFive: { openness: 82, conscientiousness: 76, extraversion: 28, agreeableness: 56, neuroticism: 36 },
    attachmentStyle: 'avoidant',
  },
  {
    id: 90005,
    authUserId: null,
    name: 'Elena',
    age: 31,
    city: 'Iași',
    vibe: 'Glass artist, dawn person',
    bio: 'Run a small glass studio near Copou. Mornings are sacred. Don\'t text before 9 unless something\'s on fire.',
    interests: ['Glassblowing', 'Sunrise walks', 'Bread baking', 'Folk music', 'Jazz'],
    palette: ['#2a1f1f', '#473131'],
    photos: [
      unsplash('photo-1544723795-3fb6469f5b39'),
      unsplash('photo-1525134479668-1bee5c7c6845'),
      unsplash('photo-1534528741775-53994a69daeb'),
    ],
    gender: 'Woman',
    distanceKm: 24,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Cancer',
    bigFive: { openness: 74, conscientiousness: 70, extraversion: 46, agreeableness: 78, neuroticism: 38 },
    attachmentStyle: 'secure',
  },
  {
    id: 90006,
    authUserId: null,
    name: 'Cristian',
    age: 41,
    city: 'București',
    vibe: 'Restaurant owner, dad of two',
    bio: 'Run a small Mediterranean place in Floreasca. Two kids (12, 9), shared custody. Looking for someone who likes the chaos.',
    interests: ['Cooking', 'Wine', 'Travel', 'Football', 'My kids'],
    palette: ['#231b32', '#3d2c4f'],
    photos: [
      unsplash('photo-1519085360753-af0119f7cbe7'),
      unsplash('photo-1519345182560-3f2917c472ef'),
      unsplash('photo-1500648767791-00dcc994a43e'),
    ],
    gender: 'Man',
    distanceKm: 3,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Taurus',
    bigFive: { openness: 62, conscientiousness: 74, extraversion: 78, agreeableness: 80, neuroticism: 34 },
    attachmentStyle: 'secure',
  },
  {
    id: 90007,
    authUserId: null,
    name: 'Diana',
    age: 27,
    city: 'Brașov',
    vibe: 'Snowboard instructor',
    bio: 'Six months on the mountain, six months on a sailboat in the Aegean. If you also can\'t sit still, we\'ll get on.',
    interests: ['Snowboarding', 'Sailing', 'Languages', 'Cooking', 'Surfing'],
    palette: ['#152030', '#283e54'],
    photos: [
      unsplash('photo-1499952127939-9bbf5af6c51c'),
      unsplash('photo-1521572267360-ee0c2909d518'),
      unsplash('photo-1487412720507-e7ab37603c6f'),
    ],
    gender: 'Woman',
    distanceKm: 38,
    verified: false,
    relationshipGoal: 'Figuring it out',
    zodiac: 'Sagittarius',
    bigFive: { openness: 84, conscientiousness: 52, extraversion: 82, agreeableness: 60, neuroticism: 42 },
    attachmentStyle: 'avoidant',
  },
  {
    id: 90008,
    authUserId: null,
    name: 'Vlad',
    age: 33,
    city: 'Cluj-Napoca',
    vibe: 'Backend dev, weekend luthier',
    bio: 'Build software for a living, build guitars for the soul. Currently rebuilding a 1968 Höfner my grandfather left me.',
    interests: ['Guitars', 'Coding', 'Folk music', 'Woodworking', 'Espresso'],
    palette: ['#1c2331', '#324054'],
    photos: [
      unsplash('photo-1506277886164-e25aa3f4ef7f'),
      unsplash('photo-1541534401786-2077eed87a72'),
      unsplash('photo-1519345182560-3f2917c472ef'),
    ],
    gender: 'Man',
    distanceKm: 14,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Libra',
    bigFive: { openness: 72, conscientiousness: 78, extraversion: 40, agreeableness: 72, neuroticism: 30 },
    attachmentStyle: 'secure',
  },
  {
    id: 90009,
    authUserId: null,
    name: 'Carmen',
    age: 36,
    city: 'București',
    vibe: 'Therapist, tango dancer',
    bio: 'Clinical psychologist. Three nights a week I dance Argentine tango in a basement near Piața Romană. It saved my life once.',
    interests: ['Tango', 'Psychology', 'Buenos Aires', 'Theatre', 'Literature'],
    palette: ['#33172a', '#522843'],
    photos: [
      unsplash('photo-1488426862026-3ee34a7d66df'),
      unsplash('photo-1534528741775-53994a69daeb'),
      unsplash('photo-1525134479668-1bee5c7c6845'),
    ],
    gender: 'Woman',
    distanceKm: 5,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Pisces',
    bigFive: { openness: 86, conscientiousness: 68, extraversion: 58, agreeableness: 82, neuroticism: 40 },
    attachmentStyle: 'secure',
  },
  {
    id: 90010,
    authUserId: null,
    name: 'Tudor',
    age: 28,
    city: 'București',
    vibe: 'Editor & long-walker',
    bio: 'Edit fiction for a small press. Walk the city for hours. Looking for someone who reads slowly and remembers what they read.',
    interests: ['Literature', 'Walking', 'Cinema', 'Letters', 'Wine'],
    palette: ['#1f1a26', '#352a40'],
    photos: [
      unsplash('photo-1504593811423-6dd665756598'),
      unsplash('photo-1500648767791-00dcc994a43e'),
      unsplash('photo-1507003211169-0a1dd7228f2d'),
    ],
    gender: 'Man',
    distanceKm: 7,
    verified: false,
    relationshipGoal: 'Long-term',
    zodiac: 'Gemini',
    bigFive: { openness: 90, conscientiousness: 62, extraversion: 32, agreeableness: 76, neuroticism: 50 },
    attachmentStyle: 'anxious',
  },
  {
    id: 90011,
    authUserId: null,
    name: 'Sky',
    age: 30,
    city: 'București',
    vibe: 'Climate researcher',
    bio: 'PhD in atmospheric science. Spend three months a year in Svalbard. Climb in Bușteni when I\'m home.',
    interests: ['Climbing', 'Science', 'Arctic', 'Speculative fiction', 'Permaculture'],
    palette: ['#1a2632', '#2e4257'],
    photos: [
      unsplash('photo-1499952127939-9bbf5af6c51c'),
      unsplash('photo-1517841905240-472988babdf9'),
      unsplash('photo-1504257432389-52343af06ae3'),
    ],
    gender: 'Non-binary',
    distanceKm: 11,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Aquarius',
    bigFive: { openness: 92, conscientiousness: 80, extraversion: 48, agreeableness: 66, neuroticism: 34 },
    attachmentStyle: 'secure',
  },
  {
    id: 90012,
    authUserId: null,
    name: 'Mara',
    age: 32,
    city: 'București',
    vibe: 'Pastry chef, ex-lawyer',
    bio: 'Quit law at 29 to apprentice in a Parisian pâtisserie. Now run a small bakery in Cotroceni. Best croissant in the city — debatable.',
    interests: ['Baking', 'Paris', 'Ceramics', 'Slow food', 'French film'],
    palette: ['#2d1f1f', '#4a3232'],
    photos: [
      unsplash('photo-1494790108377-be9c29b29330'),
      unsplash('photo-1544723795-3fb6469f5b39'),
      unsplash('photo-1521572267360-ee0c2909d518'),
    ],
    gender: 'Woman',
    distanceKm: 5,
    verified: true,
    relationshipGoal: 'Long-term',
    zodiac: 'Leo',
    bigFive: { openness: 80, conscientiousness: 74, extraversion: 62, agreeableness: 76, neuroticism: 36 },
    attachmentStyle: 'secure',
  },
]

/**
 * The two profiles that Guest Tour starts pre-matched with. Phase 2
 * wires up their chat threads with pre-baked message history so the
 * Chats tab and ChatScreen surfaces are visible end-to-end.
 *
 * Pre-baked matches stay short (2 profiles) to avoid the "stranger
 * to dozens of fake people" feeling — the tour is supposed to be a
 * tasting menu, not a banquet.
 */
export const DEMO_GUEST_MATCH_IDS: readonly number[] = [90001, 90002]

/**
 * The synthetic "self" identity Guest Tour uses. Not a real Supabase
 * auth user — these values are populated in local state only.
 */
export const DEMO_GUEST_EMAIL = 'guest@prive-app.club'
export const DEMO_GUEST_NAME = 'Guest'

/**
 * Synthetic SelfProfile seeded into React state when isGuest flips
 * true. Provides:
 *   - a non-empty name so the onboarding-routing useEffect doesn't
 *     drop the visitor into the Onboarding wizard
 *   - one placeholder photo so the Profile screen looks lived-in
 *   - Tier A scores + a canned Love Personality reveal so the
 *     LovePersonalityScreen has a cinematic moment to show during
 *     the tour (no Claude call needed — the reveal is hand-written
 *     here once)
 *
 * Values are deliberately neutral so a tour visitor's first impression
 * isn't "this is someone else's profile" — it's "this is what mine
 * could look like".
 */
export const DEMO_GUEST_SELF_PROFILE: SelfProfile = {
  ...EMPTY_SELF_PROFILE,
  name: 'Guest',
  age: 32,
  city: 'București',
  vibe: 'Curious from the outside, looking in',
  bio: 'You\'re touring Privé. The fields on this screen are placeholders — sign up to make them yours.',
  interests: ['Books', 'Coffee', 'Cinema', 'Travel', 'Music'],
  pronouns: 'they/them',
  gender: 'Non-binary',
  orientation: 'Open',
  lookingFor: 'Long-term',
  relationshipIntent: 'Long-term',
  zodiac: 'Aquarius',
  photos: [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1600&q=85',
  ],
  lovePersonality: {
    bigFive: { openness: 84, conscientiousness: 66, extraversion: 50, agreeableness: 72, neuroticism: 38 },
    attachment: 'secure',
    attachmentRatings: { secure: 5, anxious: 2, avoidant: 2, disorganized: 1 },
    completedAt: new Date().toISOString(),
    reveal: {
      archetypeName: 'Open Threshold',
      headline: 'You step toward what intrigues you — and pause long enough to be sure it can hold you back.',
      description:
        'You meet new people with curiosity rather than caution; the question you ask isn\'t "is this safe" but "is this real". That openness is what others remember about you first.\n\nWhen something starts to matter, you slow down. You read carefully, you watch how words land, you give the other person room to be inconsistent without holding it against them. The pace is yours to set.\n\nWhat you offer a partner is a kind of generous attention — the kind that makes someone feel seen without being measured. The growth edge is naming what you need before silence does the asking.',
      strengths: ['Curious without being naïve', 'Sets a gentle pace', 'Listens for the unsaid'],
      growthEdges: ['Asks for what you need earlier', 'Trusts your own first read'],
      language: 'en',
      generatedAt: new Date().toISOString(),
    },
  },
}

/**
 * Pre-baked chat threads for the two pre-matched demo profiles. The
 * conversations are intentionally short (3-5 messages) — enough to
 * convey the texture of Privé's writing-first ice-break and the AI
 * tools that surround it, without overwhelming a visitor who's just
 * tasting the app.
 *
 * Timestamps are relative to "now at fixture load time" so the chat
 * list always shows recent dates regardless of when the tour starts.
 * Each thread ends on the OTHER side so the guest sees an unread
 * indicator and a natural "your turn to write" hook.
 */
const HOUR_MS = 60 * 60 * 1000
const MIN_MS = 60 * 1000

export const buildDemoChatThreads = (): Record<number, ChatMessage[]> => {
  const now = Date.now()
  // Andra (90001) — pre-matched 2 days ago, last message 17 min ago.
  const andra: ChatMessage[] = [
    {
      id: 1,
      sender: 'them',
      text: 'Honest first read on your profile: the piano line is the one that made me pause. Most people lead with their job.',
      createdAt: now - 2 * 24 * HOUR_MS,
      status: 'read',
    },
    {
      id: 2,
      sender: 'me',
      text: 'Thanks — I almost cut it. Felt too sentimental.',
      createdAt: now - 2 * 24 * HOUR_MS + 8 * MIN_MS,
      status: 'read',
    },
    {
      id: 3,
      sender: 'them',
      text: 'Don\'t. The sentimental parts are usually the true ones. What do you play when no one\'s listening?',
      createdAt: now - 2 * 24 * HOUR_MS + 14 * MIN_MS,
      status: 'read',
    },
    {
      id: 4,
      sender: 'me',
      text: 'Satie\'s first Gymnopédie. Slowly. Always slower than the metronome.',
      createdAt: now - 1 * 24 * HOUR_MS,
      status: 'read',
    },
    {
      id: 5,
      sender: 'them',
      text: 'That\'s the right tempo for that piece. Bookshop on Strada Edgar Quinet this Saturday? They have a back room with a piano nobody touches.',
      createdAt: now - 17 * MIN_MS,
      status: 'read',
    },
  ]
  // Mateo (90002) — fresh match, ~5 hours ago. Just one icebreaker
  // each so the surface shows what a "just started" conversation
  // looks like.
  const mateo: ChatMessage[] = [
    {
      id: 11,
      sender: 'them',
      text: 'The Făgăraș line on your profile — northern or southern ridge?',
      createdAt: now - 5 * HOUR_MS,
      status: 'read',
    },
    {
      id: 12,
      sender: 'me',
      text: 'Southern. Caltun → Negoiu in two days, usually. Yours?',
      createdAt: now - 4 * HOUR_MS - 30 * MIN_MS,
      status: 'read',
    },
    {
      id: 13,
      sender: 'them',
      text: 'Same. Slept at Caltun a few weeks ago, got snowed on in late May. Romania is impossible to predict.',
      createdAt: now - 35 * MIN_MS,
      status: 'read',
    },
  ]
  return {
    [90001]: andra,
    [90002]: mateo,
  }
}

/**
 * Lightweight auto-reply lines used when a guest sends a message
 * to one of the pre-matched profiles. Picked round-robin per thread
 * so the conversation feels alive without going off-brand. Pure
 * client-side — no AI call.
 */
/**
 * Hand-written Pair Dynamic reveals (Tier B) for each pre-matched
 * profile. The wrapper at services/ai/pairDynamicReveal.ts short-
 * circuits to these when the selfId is DEMO_GUEST_EMAIL — guests
 * never trigger a Claude call, so the tour never burns tokens no
 * matter how many visitors tap "Reveal our dynamic".
 *
 * Shape mirrors the live PairDynamicReveal type exactly so the
 * Guest path renders the same UI as a real reveal.
 */
export const DEMO_PAIR_DYNAMIC_REVEALS: Record<number, {
  pairArchetype: string
  headline: string
  description: string
  strengths: string[]
  frictions: string[]
  sharedGrowthEdge: string
}> = {
  90001: {
    pairArchetype: 'Slow Inkwell',
    headline: 'You both write toward each other rather than at each other — which is rarer than it should be.',
    description:
      'The texture between you is quiet and considered. Andra reads carefully and replies with the line that lands, not the line that fills space. You match her pace without trying.\n\nWhere it could rub: you both have a tendency to wait for the other to set the next move. The conversation breathes — sometimes it forgets to start. Naming "let\'s decide on a date" out loud will feel uncharacteristic; do it anyway.\n\nWhat could grow between you is a shared language for the un-said. You both already use it. The pair version of it is rarer and slower-burning, and it tends to make for the kind of love people write about decades later.',
    strengths: [
      'Mutual attention to language',
      'Compatible quiet temperaments',
      'No performance, no theatre',
    ],
    frictions: [
      'Both wait for the other to initiate',
      'Risk of long silences read as ambivalence',
    ],
    sharedGrowthEdge: 'Saying the next step out loud, even when it feels too direct',
  },
  90002: {
    pairArchetype: 'Steady Ridge',
    headline: 'You both pick a direction and move — and you don\'t need to be told that\'s love.',
    description:
      'Two conscientious, securely-attached people who treat reliability as romance. Mateo says he\'ll be at the trailhead at 5am and is at the trailhead at 5am. You read that as care; he reads your version of it as the same. Most pairs need years to build this; you start here.\n\nWhere friction could live: you both have strong views on how things should be done. With aligned outcomes the partnership feels effortless; with misaligned outcomes it can become a debate that neither of you yields. Naming small misalignments early is the work.\n\nThe shared growth edge is letting each other be wrong sometimes. Both of you are right enough of the time that the rare miss can sit unspoken for too long.',
    strengths: [
      'Both keep their word without fanfare',
      'Aligned on long-term over short-term',
      'Energy compounds in the outdoors',
    ],
    frictions: [
      'Two strong opinions on the "right way"',
      'Both reluctant to revisit small misalignments',
    ],
    sharedGrowthEdge: 'Letting each other be wrong without ceremony',
  },
}

export const DEMO_AUTO_REPLIES: Record<number, readonly string[]> = {
  90001: [
    'Saturday works. 4pm?',
    'Send me a piece you wish more people knew.',
    'I love that you write like you talk. Most people don\'t.',
  ],
  90002: [
    'Last weekend in June, weather permitting?',
    'Bring the Bauhaus book you mentioned. I want to see.',
    'There\'s a small place in Cotroceni that opens at 7am. Coffee?',
  ],
} as const
