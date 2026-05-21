// City-pair distance for Privé.
//
// Computes the great-circle distance between two cities using the
// Haversine formula on the lat/lng pinned in src/data/romanianCities.ts.
//
// Why city-pair (not precise GPS pair) — three reasons:
//   1. Privacy: no precise coordinate ever leaves the user's device or
//      reaches the server. The most we know about another user is the
//      city they typed (or autodetected and resolved to a city name).
//   2. Honesty: dating apps that claim "0.3 km away" are mostly bluffing.
//      City-level distance matches the resolution of the underlying
//      data. Users see "Same city" or "~330 km" — both meaningful.
//   3. Zero schema changes: the existing profiles.city column is the
//      only input. No PostGIS, no extra RLS, no migration.
//
// API:
//   normalizeCityName('BUCUREȘTI') => 'București' (canonical form if
//     known; otherwise returns the input trimmed)
//   findCity('Bucuresti') => CityEntry | null
//   distanceBetweenCities('București', 'Cluj-Napoca') => 327 (km, rounded)
//   formatDistance(327) => '327 km'

import { ROMANIAN_CITIES, type CityEntry } from '../data/romanianCities'

const EARTH_RADIUS_KM = 6371

const stripDiacritics = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')

const toMatchKey = (s: string): string =>
  stripDiacritics(s.trim().toLowerCase())

// Build a lookup map once at import time. Both diacritic and ASCII
// forms key the same CityEntry, so users can type either form.
const lookupMap = new Map<string, CityEntry>()
for (const city of ROMANIAN_CITIES) {
  lookupMap.set(toMatchKey(city.name), city)
  lookupMap.set(toMatchKey(city.nameAscii), city)
}

/** Resolve any user-typed city string to its canonical form (with
 *  diacritics where applicable). Returns the input trimmed if the
 *  city isn't in our dataset. */
export const normalizeCityName = (raw: string): string => {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const hit = lookupMap.get(toMatchKey(trimmed))
  return hit ? hit.name : trimmed
}

/** Look up a city in the dataset. Returns null if not found. */
export const findCity = (raw: string): CityEntry | null => {
  if (!raw) return null
  return lookupMap.get(toMatchKey(raw)) ?? null
}

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** Haversine great-circle distance in km between two lat/lng points. */
export const distanceKmBetween = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_KM * c
}

/** Distance in km between two cities. Returns null if either city is
 *  unknown to our dataset. */
export const distanceBetweenCities = (
  cityA: string,
  cityB: string,
): number | null => {
  const a = findCity(cityA)
  const b = findCity(cityB)
  if (!a || !b) return null
  if (a === b) return 0
  return Math.round(distanceKmBetween(a.lat, a.lng, b.lat, b.lng))
}

/** Human-readable distance string. */
export const formatDistance = (km: number, opts: { sameCityLabel?: string } = {}): string => {
  if (km === 0) return opts.sameCityLabel ?? 'Same city'
  if (km < 1) return '< 1 km'
  if (km < 100) return `${Math.round(km)} km`
  return `${Math.round(km)} km`
}
