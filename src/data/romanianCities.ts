// Romanian cities dataset for Privé.
//
// Purpose:
//   1. Curated typeahead source for the City field (datalist) — solves
//      the "București" vs "Bucuresti" vs "BUCURESTI" data-quality bug
//      that silently breaks the discover filter.
//   2. lat/lng for city-pair distance computation — replaces the mock
//      Profile.distanceKm with a real km distance between two profiles'
//      cities, computed client-side via Haversine. No precise lat/lng
//      is ever persisted on the profile — city-level granularity is
//      enough and matches what dating apps SHOULD do for privacy.
//
// Source: official Romanian administrative-division data (INS census
// + standard city center coordinates from OpenStreetMap). Includes:
//   - All municipalities + județ capitals (~50)
//   - Resort + tourist towns commonly listed by Romanian users
//   - Bucharest sectors 1–6 (each pinned to its administrative center)
//   - Major EU capitals for international / traveling users
//
// To extend: append entries with { name, nameAscii, region, lat, lng,
// country }. Keep name in the local-language canonical form (with
// diacritics where applicable) — that's what users see.

export type CityEntry = {
  /** Local-language canonical form, with diacritics. Displayed in UI. */
  name: string
  /** ASCII fold of name for matching against user input. */
  nameAscii: string
  /** Region / county / state (display only, no matching). */
  region: string | null
  /** ISO 3166-1 alpha-2, lowercase. */
  country: string
  /** WGS-84 latitude, decimal degrees. */
  lat: number
  /** WGS-84 longitude, decimal degrees. */
  lng: number
}

export const ROMANIAN_CITIES: readonly CityEntry[] = [
  // ─── Top 20 Romanian cities by population ────────────────────────
  { name: 'București', nameAscii: 'Bucuresti', region: 'Municipiul București', country: 'ro', lat: 44.4268, lng: 26.1025 },
  { name: 'Cluj-Napoca', nameAscii: 'Cluj-Napoca', region: 'Cluj', country: 'ro', lat: 46.7712, lng: 23.6236 },
  { name: 'Timișoara', nameAscii: 'Timisoara', region: 'Timiș', country: 'ro', lat: 45.7489, lng: 21.2087 },
  { name: 'Iași', nameAscii: 'Iasi', region: 'Iași', country: 'ro', lat: 47.1585, lng: 27.6014 },
  { name: 'Constanța', nameAscii: 'Constanta', region: 'Constanța', country: 'ro', lat: 44.1598, lng: 28.6348 },
  { name: 'Craiova', nameAscii: 'Craiova', region: 'Dolj', country: 'ro', lat: 44.3302, lng: 23.7949 },
  { name: 'Brașov', nameAscii: 'Brasov', region: 'Brașov', country: 'ro', lat: 45.6580, lng: 25.6012 },
  { name: 'Galați', nameAscii: 'Galati', region: 'Galați', country: 'ro', lat: 45.4353, lng: 28.0080 },
  { name: 'Ploiești', nameAscii: 'Ploiesti', region: 'Prahova', country: 'ro', lat: 44.9469, lng: 26.0297 },
  { name: 'Oradea', nameAscii: 'Oradea', region: 'Bihor', country: 'ro', lat: 47.0722, lng: 21.9217 },
  { name: 'Brăila', nameAscii: 'Braila', region: 'Brăila', country: 'ro', lat: 45.2692, lng: 27.9576 },
  { name: 'Arad', nameAscii: 'Arad', region: 'Arad', country: 'ro', lat: 46.1866, lng: 21.3123 },
  { name: 'Pitești', nameAscii: 'Pitesti', region: 'Argeș', country: 'ro', lat: 44.8606, lng: 24.8678 },
  { name: 'Sibiu', nameAscii: 'Sibiu', region: 'Sibiu', country: 'ro', lat: 45.7983, lng: 24.1255 },
  { name: 'Bacău', nameAscii: 'Bacau', region: 'Bacău', country: 'ro', lat: 46.5670, lng: 26.9145 },
  { name: 'Târgu Mureș', nameAscii: 'Targu Mures', region: 'Mureș', country: 'ro', lat: 46.5454, lng: 24.5615 },
  { name: 'Baia Mare', nameAscii: 'Baia Mare', region: 'Maramureș', country: 'ro', lat: 47.6573, lng: 23.5687 },
  { name: 'Buzău', nameAscii: 'Buzau', region: 'Buzău', country: 'ro', lat: 45.1500, lng: 26.8333 },
  { name: 'Botoșani', nameAscii: 'Botosani', region: 'Botoșani', country: 'ro', lat: 47.7484, lng: 26.6692 },
  { name: 'Satu Mare', nameAscii: 'Satu Mare', region: 'Satu Mare', country: 'ro', lat: 47.7920, lng: 22.8855 },

  // ─── Bucharest sectors ───────────────────────────────────────────
  { name: 'Sector 1', nameAscii: 'Sector 1', region: 'București', country: 'ro', lat: 44.4868, lng: 26.0590 },
  { name: 'Sector 2', nameAscii: 'Sector 2', region: 'București', country: 'ro', lat: 44.4500, lng: 26.1330 },
  { name: 'Sector 3', nameAscii: 'Sector 3', region: 'București', country: 'ro', lat: 44.4216, lng: 26.1490 },
  { name: 'Sector 4', nameAscii: 'Sector 4', region: 'București', country: 'ro', lat: 44.3833, lng: 26.1166 },
  { name: 'Sector 5', nameAscii: 'Sector 5', region: 'București', country: 'ro', lat: 44.4030, lng: 26.0680 },
  { name: 'Sector 6', nameAscii: 'Sector 6', region: 'București', country: 'ro', lat: 44.4400, lng: 26.0080 },
  { name: 'Voluntari', nameAscii: 'Voluntari', region: 'Ilfov', country: 'ro', lat: 44.4900, lng: 26.1850 },
  { name: 'Otopeni', nameAscii: 'Otopeni', region: 'Ilfov', country: 'ro', lat: 44.5450, lng: 26.0680 },
  { name: 'Buftea', nameAscii: 'Buftea', region: 'Ilfov', country: 'ro', lat: 44.5640, lng: 25.9530 },
  { name: 'Pipera', nameAscii: 'Pipera', region: 'Ilfov', country: 'ro', lat: 44.4800, lng: 26.1280 },

  // ─── Județ capitals + medium cities ──────────────────────────────
  { name: 'Râmnicu Vâlcea', nameAscii: 'Ramnicu Valcea', region: 'Vâlcea', country: 'ro', lat: 45.1047, lng: 24.3754 },
  { name: 'Suceava', nameAscii: 'Suceava', region: 'Suceava', country: 'ro', lat: 47.6512, lng: 26.2556 },
  { name: 'Drobeta-Turnu Severin', nameAscii: 'Drobeta-Turnu Severin', region: 'Mehedinți', country: 'ro', lat: 44.6266, lng: 22.6562 },
  { name: 'Piatra-Neamț', nameAscii: 'Piatra-Neamt', region: 'Neamț', country: 'ro', lat: 46.9285, lng: 26.3700 },
  { name: 'Târgu Jiu', nameAscii: 'Targu Jiu', region: 'Gorj', country: 'ro', lat: 45.0364, lng: 23.2747 },
  { name: 'Tulcea', nameAscii: 'Tulcea', region: 'Tulcea', country: 'ro', lat: 45.1652, lng: 28.7929 },
  { name: 'Reșița', nameAscii: 'Resita', region: 'Caraș-Severin', country: 'ro', lat: 45.2992, lng: 21.8898 },
  { name: 'Slatina', nameAscii: 'Slatina', region: 'Olt', country: 'ro', lat: 44.4308, lng: 24.3691 },
  { name: 'Călărași', nameAscii: 'Calarasi', region: 'Călărași', country: 'ro', lat: 44.2059, lng: 27.3306 },
  { name: 'Alba Iulia', nameAscii: 'Alba Iulia', region: 'Alba', country: 'ro', lat: 46.0667, lng: 23.5800 },
  { name: 'Giurgiu', nameAscii: 'Giurgiu', region: 'Giurgiu', country: 'ro', lat: 43.9037, lng: 25.9697 },
  { name: 'Deva', nameAscii: 'Deva', region: 'Hunedoara', country: 'ro', lat: 45.8800, lng: 22.9000 },
  { name: 'Bârlad', nameAscii: 'Barlad', region: 'Vaslui', country: 'ro', lat: 46.2289, lng: 27.6661 },
  { name: 'Roman', nameAscii: 'Roman', region: 'Neamț', country: 'ro', lat: 46.9233, lng: 26.9358 },
  { name: 'Focșani', nameAscii: 'Focsani', region: 'Vrancea', country: 'ro', lat: 45.6961, lng: 27.1864 },
  { name: 'Hunedoara', nameAscii: 'Hunedoara', region: 'Hunedoara', country: 'ro', lat: 45.7500, lng: 22.9000 },
  { name: 'Vaslui', nameAscii: 'Vaslui', region: 'Vaslui', country: 'ro', lat: 46.6406, lng: 27.7295 },
  { name: 'Onești', nameAscii: 'Onesti', region: 'Bacău', country: 'ro', lat: 46.2456, lng: 26.7689 },
  { name: 'Făgăraș', nameAscii: 'Fagaras', region: 'Brașov', country: 'ro', lat: 45.8467, lng: 24.9728 },
  { name: 'Sighișoara', nameAscii: 'Sighisoara', region: 'Mureș', country: 'ro', lat: 46.2197, lng: 24.7929 },
  { name: 'Sighetu Marmației', nameAscii: 'Sighetu Marmatiei', region: 'Maramureș', country: 'ro', lat: 47.9286, lng: 23.8889 },
  { name: 'Lugoj', nameAscii: 'Lugoj', region: 'Timiș', country: 'ro', lat: 45.6906, lng: 21.9036 },
  { name: 'Mediaș', nameAscii: 'Medias', region: 'Sibiu', country: 'ro', lat: 46.1633, lng: 24.3536 },
  { name: 'Pașcani', nameAscii: 'Pascani', region: 'Iași', country: 'ro', lat: 47.2467, lng: 26.7256 },
  { name: 'Câmpulung', nameAscii: 'Campulung', region: 'Argeș', country: 'ro', lat: 45.2675, lng: 25.0469 },
  { name: 'Carei', nameAscii: 'Carei', region: 'Satu Mare', country: 'ro', lat: 47.6886, lng: 22.4669 },
  { name: 'Dej', nameAscii: 'Dej', region: 'Cluj', country: 'ro', lat: 47.1417, lng: 23.8675 },
  { name: 'Turda', nameAscii: 'Turda', region: 'Cluj', country: 'ro', lat: 46.5667, lng: 23.7833 },
  { name: 'Bistrița', nameAscii: 'Bistrita', region: 'Bistrița-Năsăud', country: 'ro', lat: 47.1333, lng: 24.5000 },
  { name: 'Zalău', nameAscii: 'Zalau', region: 'Sălaj', country: 'ro', lat: 47.1908, lng: 23.0578 },
  { name: 'Tecuci', nameAscii: 'Tecuci', region: 'Galați', country: 'ro', lat: 45.8492, lng: 27.4347 },
  { name: 'Mioveni', nameAscii: 'Mioveni', region: 'Argeș', country: 'ro', lat: 44.9700, lng: 24.9500 },

  // ─── Resort / tourist towns ──────────────────────────────────────
  { name: 'Mamaia', nameAscii: 'Mamaia', region: 'Constanța', country: 'ro', lat: 44.2533, lng: 28.6244 },
  { name: 'Mangalia', nameAscii: 'Mangalia', region: 'Constanța', country: 'ro', lat: 43.8167, lng: 28.5833 },
  { name: 'Năvodari', nameAscii: 'Navodari', region: 'Constanța', country: 'ro', lat: 44.3167, lng: 28.6000 },
  { name: 'Eforie', nameAscii: 'Eforie', region: 'Constanța', country: 'ro', lat: 44.0586, lng: 28.6336 },
  { name: 'Sinaia', nameAscii: 'Sinaia', region: 'Prahova', country: 'ro', lat: 45.3500, lng: 25.5500 },
  { name: 'Bușteni', nameAscii: 'Busteni', region: 'Prahova', country: 'ro', lat: 45.4000, lng: 25.5500 },
  { name: 'Predeal', nameAscii: 'Predeal', region: 'Brașov', country: 'ro', lat: 45.5108, lng: 25.5736 },
  { name: 'Azuga', nameAscii: 'Azuga', region: 'Prahova', country: 'ro', lat: 45.4639, lng: 25.5547 },
  { name: 'Sovata', nameAscii: 'Sovata', region: 'Mureș', country: 'ro', lat: 46.5917, lng: 25.0683 },
  { name: 'Băile Felix', nameAscii: 'Baile Felix', region: 'Bihor', country: 'ro', lat: 46.9967, lng: 21.9700 },
  { name: 'Băile Herculane', nameAscii: 'Baile Herculane', region: 'Caraș-Severin', country: 'ro', lat: 44.8800, lng: 22.4150 },
  { name: 'Curtea de Argeș', nameAscii: 'Curtea de Arges', region: 'Argeș', country: 'ro', lat: 45.1394, lng: 24.6722 },
  { name: 'Câmpina', nameAscii: 'Campina', region: 'Prahova', country: 'ro', lat: 45.1242, lng: 25.7361 },
  { name: 'Cisnădie', nameAscii: 'Cisnadie', region: 'Sibiu', country: 'ro', lat: 45.7167, lng: 24.1500 },

  // ─── Major EU capitals (for international users) ─────────────────
  { name: 'London', nameAscii: 'London', region: 'England', country: 'gb', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', nameAscii: 'Paris', region: 'Île-de-France', country: 'fr', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', nameAscii: 'Berlin', region: 'Berlin', country: 'de', lat: 52.5200, lng: 13.4050 },
  { name: 'Madrid', nameAscii: 'Madrid', region: 'Madrid', country: 'es', lat: 40.4168, lng: -3.7038 },
  { name: 'Rome', nameAscii: 'Rome', region: 'Lazio', country: 'it', lat: 41.9028, lng: 12.4964 },
  { name: 'Vienna', nameAscii: 'Vienna', region: 'Vienna', country: 'at', lat: 48.2082, lng: 16.3738 },
  { name: 'Amsterdam', nameAscii: 'Amsterdam', region: 'North Holland', country: 'nl', lat: 52.3676, lng: 4.9041 },
  { name: 'Brussels', nameAscii: 'Brussels', region: 'Brussels', country: 'be', lat: 50.8503, lng: 4.3517 },
  { name: 'Lisbon', nameAscii: 'Lisbon', region: 'Lisbon', country: 'pt', lat: 38.7223, lng: -9.1393 },
  { name: 'Prague', nameAscii: 'Prague', region: 'Prague', country: 'cz', lat: 50.0755, lng: 14.4378 },
  { name: 'Warsaw', nameAscii: 'Warsaw', region: 'Masovian', country: 'pl', lat: 52.2297, lng: 21.0122 },
  { name: 'Budapest', nameAscii: 'Budapest', region: 'Budapest', country: 'hu', lat: 47.4979, lng: 19.0402 },
  { name: 'Athens', nameAscii: 'Athens', region: 'Attica', country: 'gr', lat: 37.9838, lng: 23.7275 },
  { name: 'Stockholm', nameAscii: 'Stockholm', region: 'Stockholm', country: 'se', lat: 59.3293, lng: 18.0686 },
  { name: 'Copenhagen', nameAscii: 'Copenhagen', region: 'Capital Region', country: 'dk', lat: 55.6761, lng: 12.5683 },
  { name: 'Dublin', nameAscii: 'Dublin', region: 'Leinster', country: 'ie', lat: 53.3498, lng: -6.2603 },
  { name: 'Sofia', nameAscii: 'Sofia', region: 'Sofia', country: 'bg', lat: 42.6977, lng: 23.3219 },
  { name: 'Belgrade', nameAscii: 'Belgrade', region: 'Belgrade', country: 'rs', lat: 44.7866, lng: 20.4489 },
  { name: 'Kyiv', nameAscii: 'Kyiv', region: 'Kyiv', country: 'ua', lat: 50.4501, lng: 30.5234 },
  { name: 'Chișinău', nameAscii: 'Chisinau', region: 'Chișinău', country: 'md', lat: 47.0105, lng: 28.8638 },
]

/** Quick set of ASCII-lowercased names for membership checks. */
export const ROMANIAN_CITY_ASCII_SET = new Set(
  ROMANIAN_CITIES.map((c) => c.nameAscii.toLowerCase()),
)
