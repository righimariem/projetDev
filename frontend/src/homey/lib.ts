import type { Listing, RoommateProfile, SearchCriteria, SearchPrefs } from './types'

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

export const money = (n: number) => `${Math.round(n).toLocaleString('en-US')} DT`

export const dateLabel = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const shortDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

// Petite signature déterministe pour éviter des scores tous identiques
function jitter(id: string, range = 2) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  return (h % (range * 2 + 1)) - range
}

export const defaultPrefs: SearchPrefs = {
  city: 'Ariana',
  budgetMax: 700,
  layout: 'S+1',
  furnished: true,
  nearMetro: true,
  quiet: true,
}

/** Score de compatibilité logement ↔ profil (F2/F8) avec raisons lisibles. */
export function scoreListing(listing: Listing, prefs: Partial<SearchPrefs> = defaultPrefs) {
  let weight = 0
  let total = 0
  const reasons: string[] = []

  const add = (w: number, ok: boolean, reason: string) => {
    total += w
    if (ok) weight += w
    if (ok && reason) reasons.push(reason)
  }

  const budget = prefs.budgetMax
  if (budget) {
    const ok = listing.rent <= budget
    add(30, ok, ok ? `Within your ${money(budget)} monthly budget` : '')
    if (!ok) add(0, false, '')
  }

  if (prefs.city) {
    const ok = listing.city.toLowerCase() === prefs.city.toLowerCase()
    add(24, ok, ok ? `${listing.neighbourhood}, in ${listing.city}, where you want to live` : '')
  }

  if (prefs.layout) {
    const ok = listing.layout === prefs.layout
    add(12, ok, ok ? `${listing.layout} layout, as you asked` : '')
  }

  if (prefs.furnished) add(8, listing.furnished, listing.furnished ? 'Furnished, as you requested' : '')
  if (prefs.nearMetro) {
    add(8, listing.nearMetro, listing.nearMetro ? 'Near the Tunis metro line (4 min walk)' : '')
  }
  if (prefs.quiet) add(8, listing.quiet, listing.quiet ? 'Quiet residential street' : '')

  add(8, listing.verified, listing.verified ? 'Owner identity and listing verified by Homey' : '')
  add(6, listing.surface >= 50, listing.surface >= 50 ? 'Surface adapted to your profile' : '')

  const ratio = total === 0 ? 0.8 : weight / total
  const score = Math.max(52, Math.min(98, Math.round(54 + ratio * 40 + jitter(listing.id))))
  return { score, reasons: reasons.slice(0, 6) }
}

/** Points communs colocation (F4/F8). */
export function scoreRoommate(
  profile: RoommateProfile,
  prefs: Partial<SearchPrefs>,
  me?: RoommateProfile,
) {
  let score = 48
  const reasons: string[] = []

  if (prefs.budgetMax) {
    const diff = Math.abs(profile.budget - prefs.budgetMax)
    const closeness = Math.max(0, 1 - diff / 500)
    score += closeness * 16
    if (closeness > 0.6) reasons.push('Budget range is close to yours')
  }
  if (prefs.city && profile.city.toLowerCase() === prefs.city.toLowerCase()) {
    score += 12
    reasons.push('Looking in the same area')
  }
  if (prefs.layout && profile.layout === prefs.layout) {
    score += 8
    reasons.push('Same preferred layout')
  }
  if (me) {
    const shared = profile.lifestyle.filter((l) => me.lifestyle.includes(l))
    if (shared.length) {
      score += Math.min(14, shared.length * 5)
      reasons.push(shared.slice(0, 3).join(' · '))
    }
    if (profile.smoking === me.smoking) {
      score += 5
      reasons.push(`${profile.smoking}, like you`)
    }
    if (profile.noise === me.noise) {
      score += 5
      reasons.push(`${profile.noise} home, same as you`)
    }
  } else {
    if (profile.smoking === 'Non-smoker') {
      score += 5
      reasons.push('Non-smoker')
    }
    if (profile.noise === 'Quiet') {
      score += 5
      reasons.push('Prefers a quiet home')
    }
  }

  return {
    score: Math.max(56, Math.min(96, Math.round(score + jitter(profile.userId, 2)))),
    reasons,
  }
}

const CITY_ALIASES: Record<string, string> = {
  menzah: 'Ariana',
  ennasr: 'Ariana',
  ariana: 'Ariana',
  bardo: 'Tunis',
  'lac 2': 'Tunis',
  lac: 'Tunis',
  'tunis centre': 'Tunis',
  tunis: 'Tunis',
  'la marsa': 'La Marsa',
  marsa: 'La Marsa',
  gammarth: 'Gammarth',
  manouba: 'Manouba',
  'ben arous': 'Ben Arous',
  'sidi bou said': 'Sidi Bou Said',
}

/** Interprétation locale d'une phrase en critères structurés (F8). */
export function parseQuery(input: string): SearchCriteria {
  const text = input.toLowerCase()
  const criteria: SearchCriteria = { keywords: [] }

  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(text)) {
      criteria.city = city
      break
    }
  }

  const budgetMatch =
    text.match(/(\d{3,4})\s*(?:dt|dinar|tnd)/) ||
    text.match(/(?:under|below|up to|max(?:imum)?|budget(?: of)?)\s*(\d{3,4})/) ||
    text.match(/(\d{3,4})/)
  if (budgetMatch) {
    const value = Number(budgetMatch[1])
    if (value >= 200 && value <= 4000) criteria.budgetMax = value
  }

  const layout = text.match(/s\s*\+\s*(\d)/)
  if (layout) criteria.layout = `S+${layout[1]}`

  if (/\b(2|two)[\s-]*(bed|bedroom|chambre)/.test(text)) criteria.bedrooms = 2
  else if (/\b(3|three)[\s-]*(bed|bedroom|chambre)/.test(text)) criteria.bedrooms = 3

  if (/furnish|meubl/.test(text)) criteria.furnished = true
  if (/metro|transport|tram|station/.test(text)) criteria.nearMetro = true
  if (/quiet|calm|silence|tranquill/.test(text)) criteria.quiet = true
  if (/villa|house/.test(text)) criteria.type = 'Villa'
  else if (/studio/.test(text)) criteria.type = 'Studio'
  else if (/room\b|shared/.test(text)) criteria.type = 'Room'

  for (const word of ['balcony', 'parking', 'elevator', 'garden', 'pool', 'security', 'internet']) {
    if (text.includes(word)) criteria.keywords.push(word)
  }

  return criteria
}

export function searchListings(listings: Listing[], criteria: SearchCriteria) {
  return listings
    .filter((l) => l.status === 'published')
    .filter((l) => (criteria.city ? l.city === criteria.city : true))
    .filter((l) => (criteria.budgetMax ? l.rent <= criteria.budgetMax : true))
    .filter((l) => (criteria.layout ? l.layout === criteria.layout : true))
    .filter((l) => (criteria.furnished ? l.furnished : true))
    .filter((l) => (criteria.nearMetro ? l.nearMetro : true))
    .filter((l) => (criteria.quiet ? l.quiet : true))
    .filter((l) => (criteria.bedrooms ? l.bedrooms >= criteria.bedrooms : true))
    .filter((l) => (criteria.type ? l.type === criteria.type : true))
    .map((l) => ({
      listing: l,
      ...scoreListing(l, {
        city: criteria.city,
        budgetMax: criteria.budgetMax,
        layout: criteria.layout,
        furnished: criteria.furnished,
        nearMetro: criteria.nearMetro,
        quiet: criteria.quiet,
      }),
    }))
    .sort((a, b) => b.score - a.score)
}

export function criteriaChips(criteria: SearchCriteria) {
  const chips: string[] = []
  if (criteria.city) chips.push(criteria.city)
  if (criteria.budgetMax) chips.push(`Up to ${criteria.budgetMax} DT`)
  if (criteria.layout) chips.push(criteria.layout)
  if (criteria.bedrooms) chips.push(`${criteria.bedrooms} bedrooms`)
  if (criteria.furnished) chips.push('Furnished')
  if (criteria.nearMetro) chips.push('Near transport')
  if (criteria.quiet) chips.push('Quiet area')
  if (criteria.type) chips.push(criteria.type)
  criteria.keywords.forEach((k) => chips.push(k[0].toUpperCase() + k.slice(1)))
  return chips
}

const CITY_RATES: Record<string, number> = {
  Tunis: 8,
  Ariana: 7.5,
  'La Marsa': 11,
  Gammarth: 13,
  Manouba: 5,
  Bardo: 5.5,
  'Ben Arous': 6,
  'Sidi Bou Said': 12,
}

/** Estimation de prix locale, dans l'esprit du modèle F6. */
export function estimatePrice(input: {
  city: string
  surface: number
  bedrooms: number
  furnished: boolean
  amenities: string[]
}) {
  const rate = CITY_RATES[input.city] ?? 7
  const base = input.surface * rate
  const rooms = 1 + Math.max(0, input.bedrooms - 1) * 0.07
  const furnished = input.furnished ? 1.11 : 1
  const amenity = 1 + Math.min(8, input.amenities.length) * 0.015
  const raw = base * rooms * furnished * amenity
  const price = Math.round(raw / 10) * 10
  return {
    price,
    low: Math.round((price * 0.9) / 10) * 10,
    high: Math.round((price * 1.12) / 10) * 10,
    perM2: Math.round((price / Math.max(1, input.surface)) * 10) / 10,
    confidence: Math.min(96, 74 + Math.round(input.surface / 20) + input.amenities.length),
    city: input.city,
  }
}

/** Contrôle qualité d'annonce (analyse IA locale). */
export function analyzeListing(listing: Listing) {
  const checks = [
    { label: 'Title and location are present', ok: Boolean(listing.title && listing.neighbourhood) },
    { label: `${listing.photos.length} photos provided`, ok: listing.photos.length >= 3 },
    { label: 'Price provided', ok: listing.rent > 0 },
    {
      label: 'Description is consistent',
      ok: listing.description.split(' ').length > 25 && !/S\+1.*two bedrooms/i.test(listing.description),
    },
    { label: 'Amenities listed', ok: listing.amenities.length >= 3 },
    { label: 'Owner identity verified', ok: listing.verified },
  ]
  const score = Math.round(
    (checks.filter((c) => c.ok).length / checks.length) * 70 + Math.min(30, listing.photos.length * 6),
  )
  return { checks, score: Math.min(99, score) }
}

export const todayLabel = () =>
  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
