// Types de l'application de démonstration Homey (design fidèle à la maquette vidéo)

export type Role = 'tenant' | 'owner' | 'admin'

export interface DemoUser {
  id: string
  name: string
  email: string
  password: string
  role: Role
  avatar: string
  city: string
  since: number
  bio: string
  phone?: string
  verified?: boolean
  suspended?: boolean
}

export type ListingStatus = 'published' | 'pending' | 'rejected' | 'draft'
export type ListingType = 'Apartment' | 'Villa' | 'Studio' | 'Room' | 'House'

export interface Listing {
  id: string
  title: string
  type: ListingType
  layout: string
  city: string
  neighbourhood: string
  address?: string
  rent: number
  surface: number
  bedrooms: number
  bathrooms: number
  furnished: boolean
  verified: boolean
  nearMetro: boolean
  quiet: boolean
  photos: string[]
  ownerId: string
  status: ListingStatus
  createdAt: string
  description: string
  amenities: string[]
  availableFrom: string
  deposit: number
  rating: number
  views: number
  saves: number
  interested: number
  qualityScore: number
  reference: string
}

export interface RoommateProfile {
  userId: string
  age: number
  job: string
  city: string
  budget: number
  layout: string
  duration: string
  lifestyle: string[]
  smoking: string
  pets: string
  noise: string
  bio: string
}

export interface ChatMessage {
  id: string
  from: 'me' | 'them'
  text: string
  at: string
}

export interface Conversation {
  id: string
  participantIds: string[]
  listingId?: string
  messages: ChatMessage[]
  unread: number
}

export type RequestStatus = 'pending' | 'accepted' | 'declined'

export interface VisitRequest {
  id: string
  tenantId: string
  listingId: string
  message: string
  moveIn: string
  status: RequestStatus
  createdAt: string
}

export type AlertSeverity = 'high' | 'medium' | 'low'
export type AlertStatus = 'open' | 'review' | 'resolved'

export interface AiAlert {
  id: string
  listingId: string
  type: string
  severity: AlertSeverity
  status: AlertStatus
  flaggedAt: string
  note: string
}

export interface DemoNotification {
  id: string
  text: string
  at: string
  read: boolean
  href?: string
}

export interface SearchPrefs {
  city: string
  budgetMax: number
  layout: string
  furnished: boolean
  nearMetro: boolean
  quiet: boolean
}

export interface SearchCriteria {
  city?: string
  budgetMax?: number
  layout?: string
  furnished?: boolean
  nearMetro?: boolean
  quiet?: boolean
  bedrooms?: number
  type?: ListingType
  keywords: string[]
}
