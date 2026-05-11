import { createSupabaseClient } from './supabaseClient'
import { generateAnswersFromSeed, sanitizeAnswers, type PersonalityAnswer } from './compatibility'

export type Profile = {
  id: number
  name: string
  age: number
  city: string
  vibe: string
  bio: string
  interests: string[]
  palette: [string, string]
  photos: string[]
  gender: 'Woman' | 'Man' | 'Non-binary'
  distanceKm: number
  verified: boolean
  relationshipGoal: 'Long-term' | 'Short-term' | 'Friends' | 'Figuring it out'
  zodiac: string
  personalityAnswers: PersonalityAnswer[]
}

type SeedProfile = Omit<
  Profile,
  'gender' | 'distanceKm' | 'verified' | 'relationshipGoal' | 'personalityAnswers'
>

const PROFILE_FIXTURE: SeedProfile[] = [
  {
    id: 1,
    name: 'Sofia',
    age: 26,
    city: 'Lisbon',
    vibe: 'Sunset chaser',
    bio: 'I make playlists for road trips and bring disposable cameras to every weekend plan.',
    interests: ['Live gigs', 'Beach runs', 'Street food'],
    palette: ['#ff7a59', '#ff3d77'],
    photos: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Leo',
  },
  {
    id: 2,
    name: 'Noah',
    age: 29,
    city: 'Berlin',
    vibe: 'Coffee + code',
    bio: 'Product designer by day, ramen hunter by night. I have strong opinions on matcha quality.',
    interests: ['Design museums', 'Vinyl', 'Late brunch'],
    palette: ['#2f80ed', '#56ccf2'],
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Taurus',
  },
  {
    id: 3,
    name: 'Maya',
    age: 25,
    city: 'Barcelona',
    vibe: 'Bold energy',
    bio: 'If we vibe, I will challenge you to mini golf and make us a dramatic victory reel.',
    interests: ['Mini golf', 'Comedy nights', 'Tapas'],
    palette: ['#8e2de2', '#4a00e0'],
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Gemini',
  },
  {
    id: 4,
    name: 'Eli',
    age: 30,
    city: 'Amsterdam',
    vibe: 'Calm adventurer',
    bio: 'I can fix your bike and your dinner plans. Looking for someone curious and kind.',
    interests: ['Cycling', 'Canal walks', 'Film photos'],
    palette: ['#f2994a', '#f2c94c'],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Cancer',
  },
  {
    id: 5,
    name: 'Ava',
    age: 27,
    city: 'Copenhagen',
    vibe: 'Cozy minimal',
    bio: 'Board game nerd with a passport ready. Favorite date: tiny cafe, giant conversation.',
    interests: ['Board games', 'Travel maps', 'Ceramics'],
    palette: ['#11998e', '#38ef7d'],
    photos: [
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Virgo',
  },
  {
    id: 6,
    name: 'Liam',
    age: 31,
    city: 'Vienna',
    vibe: 'Slow mornings',
    bio: 'Architect who sketches cafes and chases golden hour city walks.',
    interests: ['Architecture', 'Running', 'Specialty coffee'],
    palette: ['#ff9a8b', '#fad0c4'],
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Capricorn',
  },
  {
    id: 7,
    name: 'Nina',
    age: 24,
    city: 'Warsaw',
    vibe: 'Creative spark',
    bio: 'Illustrator who loves neon signs, ramen spots, and bookstore dates.',
    interests: ['Illustration', 'Ramen', 'Bookstores'],
    palette: ['#f953c6', '#b91d73'],
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Pisces',
  },
  {
    id: 8,
    name: 'Owen',
    age: 28,
    city: 'Dublin',
    vibe: 'Weekend climber',
    bio: 'Engineer, guitarist, and mountain trail planner. Looking for someone adventurous.',
    interests: ['Climbing', 'Guitar', 'Road trips'],
    palette: ['#36d1dc', '#5b86e5'],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Sagittarius',
  },
  {
    id: 9,
    name: 'Chloe',
    age: 27,
    city: 'Paris',
    vibe: 'Gallery mood',
    bio: 'Curator assistant with a soft spot for poetry nights and vintage markets.',
    interests: ['Art galleries', 'Poetry', 'Vintage'],
    palette: ['#f6d365', '#fda085'],
    photos: [
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Libra',
  },
  {
    id: 10,
    name: 'Mateo',
    age: 30,
    city: 'Madrid',
    vibe: 'Chef energy',
    bio: 'Home chef obsessed with handmade pasta and sunny terraces.',
    interests: ['Cooking', 'Farmers markets', 'Cycling'],
    palette: ['#ff9966', '#ff5e62'],
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Aries',
  },
  {
    id: 11,
    name: 'Ivy',
    age: 23,
    city: 'Brussels',
    vibe: 'Study and espresso',
    bio: 'Law student by day, dance class by night. Big fan of deep talks.',
    interests: ['Dance', 'Podcasts', 'Cafes'],
    palette: ['#a18cd1', '#fbc2eb'],
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Aquarius',
  },
  {
    id: 12,
    name: 'Jonas',
    age: 32,
    city: 'Stockholm',
    vibe: 'Minimal and warm',
    bio: 'Product manager who hosts board game nights and sauna weekends.',
    interests: ['Board games', 'Sauna', 'Nordic design'],
    palette: ['#4facfe', '#00f2fe'],
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Scorpio',
  },
  {
    id: 13,
    name: 'Rina',
    age: 26,
    city: 'Milan',
    vibe: 'Bold and bright',
    bio: 'Fashion buyer who loves weekend train trips and rooftop sunsets.',
    interests: ['Fashion', 'Rooftops', 'City breaks'],
    palette: ['#f857a6', '#ff5858'],
    photos: [
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Gemini',
  },
  {
    id: 14,
    name: 'Caleb',
    age: 29,
    city: 'Prague',
    vibe: 'Calm confidence',
    bio: 'Data analyst, vinyl collector, and occasional baker of cinnamon rolls.',
    interests: ['Vinyl', 'Baking', 'Museums'],
    palette: ['#43cea2', '#185a9d'],
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Cancer',
  },
  {
    id: 15,
    name: 'Zoe',
    age: 25,
    city: 'Athens',
    vibe: 'Sea and sun',
    bio: 'Marine biologist who still makes time for dance floors and spicy food.',
    interests: ['Diving', 'Street food', 'Salsa'],
    palette: ['#30cfd0', '#330867'],
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Pisces',
  },
  {
    id: 16,
    name: 'Aron',
    age: 34,
    city: 'Budapest',
    vibe: 'Thoughtful planner',
    bio: 'Civil engineer who bikes to work and writes tiny travel guides.',
    interests: ['Cycling', 'History walks', 'Cooking'],
    palette: ['#eecda3', '#ef629f'],
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Leo',
  },
  {
    id: 17,
    name: 'Lea',
    age: 28,
    city: 'Zurich',
    vibe: 'Mountain reset',
    bio: 'UX researcher who alternates between mountain trails and piano practice.',
    interests: ['Hiking', 'Piano', 'Photography'],
    palette: ['#667eea', '#764ba2'],
    photos: [
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Sagittarius',
  },
  {
    id: 18,
    name: 'Ben',
    age: 27,
    city: 'London',
    vibe: 'Fast pace, soft heart',
    bio: 'Startup marketer who loves live comedy and late-night dumplings.',
    interests: ['Comedy clubs', 'Dumplings', 'Football'],
    palette: ['#f7971e', '#ffd200'],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Aries',
  },
  {
    id: 19,
    name: 'Tara',
    age: 29,
    city: 'Reykjavik',
    vibe: 'Aurora nights',
    bio: 'Travel writer with a thermos obsession and a thing for hot springs.',
    interests: ['Travel journals', 'Hot springs', 'Film'],
    palette: ['#89f7fe', '#66a6ff'],
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Virgo',
  },
  {
    id: 20,
    name: 'Finn',
    age: 31,
    city: 'Oslo',
    vibe: 'Outdoor thinker',
    bio: 'Consultant by weekday, cross-country skier by weekend.',
    interests: ['Skiing', 'Podcasts', 'Trail runs'],
    palette: ['#0fd850', '#f9f047'],
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Capricorn',
  },
  {
    id: 21,
    name: 'Mila',
    age: 24,
    city: 'Tallinn',
    vibe: 'Soft focus',
    bio: 'Frontend developer with a side quest in pottery and tea tasting.',
    interests: ['Frontend', 'Pottery', 'Tea'],
    palette: ['#ffafbd', '#ffc3a0'],
    photos: [
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Libra',
  },
  {
    id: 22,
    name: 'Sam',
    age: 33,
    city: 'Munich',
    vibe: 'Warm precision',
    bio: 'Mechanical engineer who plans bikepacking routes and reads sci-fi.',
    interests: ['Bikepacking', 'Sci-fi', 'Craft beer'],
    palette: ['#00cdac', '#8ddad5'],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Taurus',
  },
  {
    id: 23,
    name: 'Jade',
    age: 27,
    city: 'Porto',
    vibe: 'Blue hour lover',
    bio: 'Photographer who likes old trams, seaside walks, and vinyl stores.',
    interests: ['Photography', 'Vinyl', 'Seafood'],
    palette: ['#7f7fd5', '#86a8e7'],
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Scorpio',
  },
  {
    id: 24,
    name: 'Ravi',
    age: 30,
    city: 'Rotterdam',
    vibe: 'Maker mindset',
    bio: 'Industrial designer who can talk for hours about city design.',
    interests: ['Design', 'Skate', 'Documentaries'],
    palette: ['#f77062', '#fe5196'],
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Aquarius',
  },
  {
    id: 25,
    name: 'Ella',
    age: 26,
    city: 'Budva',
    vibe: 'Playful depth',
    bio: 'Event planner who loves beach volleyball and tiny bookstores.',
    interests: ['Events', 'Volleyball', 'Books'],
    palette: ['#f6d365', '#fda085'],
    photos: [
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    ],
    zodiac: 'Capricorn',
  },
]

const RELATIONSHIP_GOALS: Profile['relationshipGoal'][] = [
  'Long-term',
  'Short-term',
  'Friends',
  'Figuring it out',
]

const WOMAN_IDS = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25])
const NON_BINARY_IDS = new Set([8, 16, 24])

const toHighResPhoto = (url: string): string => {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('images.unsplash.com')) {
      parsed.searchParams.set('auto', 'format')
      parsed.searchParams.set('fit', 'crop')
      parsed.searchParams.set('w', '1600')
      parsed.searchParams.set('q', '85')
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}

const WOMAN_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
]

const MAN_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
]

const NON_BINARY_PHOTO_POOL = [
  'https://api.dicebear.com/9.x/adventurer/png?seed=Sky&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Nova&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=River&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Quinn&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Zen&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Echo&size=1024',
]

const pickGenderPhotos = (gender: Profile['gender'], index: number): string[] => {
  const pool =
    gender === 'Woman'
      ? WOMAN_PHOTO_POOL
      : gender === 'Man'
        ? MAN_PHOTO_POOL
        : NON_BINARY_PHOTO_POOL

  return [
    pool[index % pool.length],
    pool[(index + 2) % pool.length],
    pool[(index + 4) % pool.length],
  ].map(toHighResPhoto)
}

const ENRICHED_PROFILES: Profile[] = PROFILE_FIXTURE.map((profile, index) => {
  const gender: Profile['gender'] = NON_BINARY_IDS.has(profile.id)
    ? 'Non-binary'
    : WOMAN_IDS.has(profile.id)
      ? 'Woman'
      : 'Man'

  return {
    ...profile,
    photos: pickGenderPhotos(gender, index),
    gender,
    distanceKm: 2 + ((index * 7) % 58),
    verified: index % 4 !== 0,
    relationshipGoal: RELATIONSHIP_GOALS[index % RELATIONSHIP_GOALS.length],
    personalityAnswers: generateAnswersFromSeed(profile.id * 17 + index),
  }
})

const MATCHABLE_IDS = new Set([1, 3, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24])

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

export const getProfiles = async (): Promise<Profile[]> => {
  await wait(220)
  const supabase = createSupabaseClient()
  if (supabase) {
    // Phase B4: real users now appear in the deck. Exclude self via
    // auth_user_id (the bridge column added in B1). When unauthenticated
    // — e.g. a guest-mode session that never created a user — there's no
    // user id to filter on so we skip the .neq() call.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const selfUid = user?.id ?? null

    let query = supabase
      .from('profiles')
      .select(
        'id, name, age, city, vibe, bio, interests, palette, photos, gender, distance_km, verified, relationship_goal, zodiac, extras, is_active, auth_user_id',
      )
      .eq('is_active', true)
      .limit(200)
    if (selfUid) {
      query = query.or(`auth_user_id.is.null,auth_user_id.neq.${selfUid}`)
    }
    const { data, error } = await query

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data
        .map((row) => {
          const genderRaw = String(row.gender ?? 'Woman')
          const relationshipRaw = String(row.relationship_goal ?? 'Long-term')
          const gender: Profile['gender'] =
            genderRaw === 'Man' || genderRaw === 'Non-binary' ? genderRaw : 'Woman'
          const relationshipGoal: Profile['relationshipGoal'] =
            relationshipRaw === 'Short-term' ||
            relationshipRaw === 'Friends' ||
            relationshipRaw === 'Figuring it out'
              ? relationshipRaw
              : 'Long-term'

          const photos = Array.isArray(row.photos)
            ? row.photos
                .filter((value): value is string => typeof value === 'string' && value.length > 0)
                .slice(0, 9)
                .map(toHighResPhoto)
            : []

          const interests = Array.isArray(row.interests)
            ? row.interests.filter((value): value is string => typeof value === 'string').slice(0, 6)
            : []

          const palette: [string, string] =
            Array.isArray(row.palette) && row.palette.length >= 2
              ? [String(row.palette[0]), String(row.palette[1])]
              : ['#141937', '#252d5c']
          const extras =
            row.extras && typeof row.extras === 'object'
              ? (row.extras as Record<string, unknown>)
              : {}
          const personalityAnswers = sanitizeAnswers(extras.personalityAnswers)

          return {
            id: Number(row.id),
            name: String(row.name ?? 'Unknown'),
            age: Number(row.age ?? 25),
            city: String(row.city ?? 'City'),
            vibe: String(row.vibe ?? 'Good energy'),
            bio: String(row.bio ?? ''),
            interests: interests.length > 0 ? interests : ['Coffee', 'Music', 'Travel'],
            palette,
            photos: photos.length > 0 ? photos : pickGenderPhotos(gender, Number(row.id) || 0),
            gender,
            distanceKm: Math.max(1, Number(row.distance_km ?? 10)),
            verified: Boolean(row.verified),
            relationshipGoal,
            zodiac: String(row.zodiac ?? 'Libra'),
            personalityAnswers:
              personalityAnswers.length === 8
                ? personalityAnswers
                : generateAnswersFromSeed(Number(row.id) || 0),
          } satisfies Profile
        })
        .filter((profile) => Number.isFinite(profile.id))

      if (mapped.length > 0) {
        return mapped
      }
    }
  }

  // No real data available — return empty so the app shows "no profiles" state.
  // The fixture data is intentionally not used in production.
  return []
}

export const resolveMatch = async (profileId: number): Promise<boolean> => {
  await wait(180)
  return MATCHABLE_IDS.has(profileId)
}

