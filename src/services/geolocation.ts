// Location autodetect for Privé.
//
// Two-step flow:
//   1. Ask the browser for the device's coordinates via the Geolocation
//      API (user must grant permission once per origin).
//   2. Reverse-geocode the coordinates to a city name via OpenStreetMap's
//      Nominatim service. Free, no API key, rate-limited to ~1 req/sec
//      per IP — fine for user-triggered "Detect my city" taps.
//
// Privacy posture:
//   - Coordinates are NEVER persisted. We resolve them to a city string
//     and discard the raw lat/lng. A precise location on a server is
//     a liability for a dating app.
//   - Users with denied permission or no GPS hardware (desktop, web view
//     without permission) get a clear error message — typing the city
//     manually still works (the input field stays a free text field).
//   - Nominatim's TOS asks for a UA identifying the app, set below.
//
// Nominatim docs: https://nominatim.org/release-docs/develop/api/Reverse/

import { normalizeCityName } from './cityDistance'

export type DetectedLocation = {
  /** Best-guess city / town / municipality name in its local form
   *  (e.g. "București" with diacritics, "Cluj-Napoca", "Iași"). */
  city: string
  /** Region / county / state, useful for disambiguation but not stored
   *  on the profile yet (e.g. "Sector 4, Municipiul București"). */
  region: string | null
  /** Two-letter ISO country code (e.g. "ro" for Romania). */
  countryCode: string | null
}

export type DetectError =
  | { kind: 'unsupported'; message: string }
  | { kind: 'permission-denied'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'reverse-failed'; message: string }

const UA = 'PriveApp/1.0 (https://prive-app.club)'

/** Request the device's current coordinates. Returns a clean error
 *  object instead of throwing so the UI can show the right message. */
const getCoords = (): Promise<{ lat: number; lng: number } | DetectError> =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        kind: 'unsupported',
        message: 'Your browser does not support location detection.',
      })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            kind: 'permission-denied',
            message:
              'Location permission denied. Tap the lock icon in the address bar to allow location, or type your city manually.',
          })
          return
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          resolve({
            kind: 'unavailable',
            message: 'Could not determine your location. Try again or type your city manually.',
          })
          return
        }
        if (err.code === err.TIMEOUT) {
          resolve({
            kind: 'timeout',
            message: 'Location lookup timed out. Try again or type your city manually.',
          })
          return
        }
        resolve({
          kind: 'unavailable',
          message: 'Could not determine your location.',
        })
      },
      {
        // High accuracy gives the best chance of correct city resolution
        // on phones with GPS; on desktop it falls back to wifi/IP-based
        // estimation which is still usually city-accurate.
        enableHighAccuracy: true,
        maximumAge: 60_000, // accept a cached fix up to 1 min old
        timeout: 12_000,
      },
    )
  })

/** Reverse-geocode via Nominatim (OpenStreetMap, primary). */
const reverseViaNominatim = async (
  lat: number,
  lng: number,
): Promise<DetectedLocation | null> => {
  // Nominatim asks for a sensible zoom for "city-level" results.
  // zoom=10 gives city/town/municipality; zoom=14 gives neighborhoods.
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'ro,en',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    address?: Record<string, string>
  }
  const addr = data.address ?? {}
  // Pick the best "city" candidate Nominatim returned. Different
  // countries label the same level of administrative division
  // differently — try the common keys in order of specificity.
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    ''
  if (!city) return null
  return {
    city,
    region: addr.county || addr.state || null,
    countryCode: addr.country_code ?? null,
  }
}

/** Reverse-geocode via Photon (OSM-based, no key, free). Fallback
 *  when Nominatim is slow or blocked. */
const reverseViaPhoton = async (
  lat: number,
  lng: number,
): Promise<DetectedLocation | null> => {
  // Photon's reverse endpoint returns GeoJSON-style features.
  // lang=ro biases toward Romanian-language names when available.
  const params = new URLSearchParams({
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
    lang: 'ro',
    limit: '1',
  })
  const res = await fetch(`https://photon.komoot.io/reverse?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    features?: Array<{
      properties?: {
        name?: string
        city?: string
        town?: string
        village?: string
        county?: string
        state?: string
        country?: string
        countrycode?: string
      }
    }>
  }
  const props = data.features?.[0]?.properties ?? {}
  const city =
    props.city ||
    props.town ||
    props.village ||
    props.name ||
    props.county ||
    props.state ||
    ''
  if (!city) return null
  return {
    city,
    region: props.county || props.state || null,
    countryCode: props.countrycode?.toLowerCase() ?? null,
  }
}

/** Try Nominatim first; on failure or empty result, try Photon. */
const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<DetectedLocation | DetectError> => {
  try {
    const primary = await reverseViaNominatim(lat, lng)
    if (primary) return primary
  } catch {
    // fall through to Photon fallback
  }
  try {
    const fallback = await reverseViaPhoton(lat, lng)
    if (fallback) return fallback
  } catch (err) {
    return {
      kind: 'reverse-failed',
      message:
        err instanceof Error
          ? `Location lookup failed: ${err.message}`
          : 'Location lookup failed.',
    }
  }
  return {
    kind: 'reverse-failed',
    message:
      'Could not resolve a city name from your location. Try typing it manually.',
  }
}

// Generic so it works for both `{lat,lng} | DetectError` and
// `DetectedLocation | DetectError` (neither success type has a `kind`
// field, so the discriminant is unambiguous).
const isDetectError = <T extends object>(
  value: T | DetectError,
): value is DetectError => {
  return 'kind' in value
}

/** Full flow: ask for coordinates, then resolve to a city. The
 *  resolved city is normalized against our Romanian city dataset so
 *  variants like "BUCURESTI" / "bucuresti" / "Bucuresti" all resolve
 *  to the canonical "București". */
export const detectMyLocation = async (): Promise<DetectedLocation | DetectError> => {
  const coords = await getCoords()
  if (isDetectError(coords)) return coords
  const resolved = await reverseGeocode(coords.lat, coords.lng)
  if (isDetectError(resolved)) return resolved
  return {
    ...resolved,
    city: normalizeCityName(resolved.city),
  }
}

export const isLocationError = (
  value: DetectedLocation | DetectError,
): value is DetectError => {
  return 'kind' in value
}
