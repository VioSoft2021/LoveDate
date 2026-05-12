import type { Circle } from '../domain'

export const CIRCLE_SEED: Circle[] = [
  {
    id: 'design-lounge',
    name: 'Design Lounge',
    theme: 'Creative critiques and inspiration',
    description: 'For product, UX, and visual people who love deep craft conversations and portfolio energy.',
    tags: ['Design', 'UX', 'Creativity'],
    memberCount: 182,
    hero:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'dl-event-1', title: 'UX Coffee Jam', when: 'Thu 19:00', where: 'Online room' },
      { id: 'dl-event-2', title: 'Portfolio Roast Night', when: 'Sat 21:00', where: 'Community Live' },
    ],
  },
  {
    id: 'travel-circle',
    name: 'Travel Circle',
    theme: 'Trips, city guides, and adventure plans',
    description: 'Share routes, hidden spots, and spontaneous weekend plans with fellow explorers.',
    tags: ['Travel', 'City breaks', 'Adventure'],
    memberCount: 246,
    hero:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'tr-event-1', title: '48h Escape Planning', when: 'Fri 18:30', where: 'Online room' },
      { id: 'tr-event-2', title: 'Budget Europe Hacks', when: 'Sun 20:00', where: 'Audio circle' },
    ],
  },
  {
    id: 'coffee-club',
    name: 'Coffee Club',
    theme: 'Beans, cafes, and cozy date spots',
    description: 'From espresso rituals to best date-friendly cafes in every city.',
    tags: ['Coffee', 'Brunch', 'Cafes'],
    memberCount: 139,
    hero:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'cf-event-1', title: 'Home Brew Workshop', when: 'Wed 20:30', where: 'Live stream' },
      { id: 'cf-event-2', title: 'Best First-Date Cafes', when: 'Sat 17:00', where: 'Group chat' },
    ],
  },
  {
    id: 'music-vinyl',
    name: 'Music & Vinyl',
    theme: 'Playlists, vinyl finds, and concerts',
    description: 'Share sounds, discover artists, and plan live-gig meetups.',
    tags: ['Music', 'Vinyl', 'Concerts'],
    memberCount: 167,
    hero:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'mv-event-1', title: 'Friday Playlist Battle', when: 'Fri 22:00', where: 'Live room' },
      { id: 'mv-event-2', title: 'Album Listening Party', when: 'Sun 21:00', where: 'Audio circle' },
    ],
  },
]
