import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  seedAlerts,
  seedConversations,
  seedListings,
  seedNotifications,
  seedRequests,
  seedRoommates,
  demoUsers,
} from './data'
import type {
  AiAlert,
  AlertStatus,
  Conversation,
  DemoNotification,
  DemoUser,
  Listing,
  ListingStatus,
  RequestStatus,
  Role,
  RoommateProfile,
  SearchPrefs,
  VisitRequest,
} from './types'
import { defaultPrefs } from './lib'

interface DemoState {
  currentUserId: string | null
  users: DemoUser[]
  listings: Listing[]
  roommates: RoommateProfile[]
  conversations: Conversation[]
  requests: VisitRequest[]
  alerts: AiAlert[]
  notifications: DemoNotification[]
  favorites: string[]
  prefs: SearchPrefs
  lastSearch: string
  login: (email: string, password: string) => { ok: boolean; error?: string }
  loginAs: (userId: string) => void
  logout: () => void
  register: (input: { name: string; email: string; password: string; role: Role; city: string }) => {
    ok: boolean
    error?: string
  }
  updateProfile: (patch: Partial<DemoUser>) => void
  setPrefs: (patch: Partial<SearchPrefs>) => void
  toggleFavorite: (id: string) => boolean
  addListing: (input: Partial<Listing> & { title: string; rent: number }) => string
  updateListing: (id: string, patch: Partial<Listing>) => void
  setListingStatus: (id: string, status: ListingStatus) => void
  startConversation: (userId: string, listingId?: string, text?: string) => string
  sendMessage: (conversationId: string, text: string) => void
  markConversationRead: (conversationId: string) => void
  requestVisit: (input: { listingId: string; message: string; moveIn: string }) => void
  respondRequest: (id: string, status: RequestStatus) => void
  setAlertStatus: (id: string, status: AlertStatus) => void
  markNotificationsRead: () => void
  setUserSuspended: (id: string, suspended: boolean) => void
  setLastSearch: (query: string) => void
  resetDemo: () => void
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const seed = () => ({
  currentUserId: null,
  users: clone(demoUsers),
  listings: clone(seedListings),
  roommates: clone(seedRoommates),
  conversations: clone(seedConversations),
  requests: clone(seedRequests),
  alerts: clone(seedAlerts),
  notifications: clone(seedNotifications),
  favorites: ['quiet-menzah', 'villa-marsa'],
  prefs: clone(defaultPrefs),
  lastSearch: '',
})

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...seed(),

      login: (email, password) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
        if (!user) return { ok: false, error: 'No demo account matches this email.' }
        if (user.password !== password) return { ok: false, error: 'That password does not match.' }
        if (user.suspended) return { ok: false, error: 'This account is suspended. Contact support.' }
        set({ currentUserId: user.id })
        return { ok: true }
      },

      loginAs: (userId) => set({ currentUserId: userId }),
      logout: () => set({ currentUserId: null }),

      register: ({ name, email, password, role, city }) => {
        if (password.length < 6) return { ok: false, error: 'Use at least 6 characters.' }
        if (get().users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          return { ok: false, error: 'An account already uses this email.' }
        }
        const id = `u-${Date.now()}`
        const user: DemoUser = {
          id,
          name,
          email,
          password,
          role,
          avatar:
            role === 'owner'
              ? '/photos/avatar-hatem.jpg'
              : role === 'admin'
                ? '/photos/avatar-sofia.jpg'
                : '/photos/avatar-sarah.jpg',
          city,
          since: 2026,
          bio: 'New on Homey — tell people a little about how you like to live.',
          verified: false,
        }
        set((s) => ({ users: [...s.users, user], currentUserId: id }))
        return { ok: true }
      },

      updateProfile: (patch) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === s.currentUserId ? { ...u, ...patch } : u)),
        })),

      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),

      toggleFavorite: (id) => {
        const exists = get().favorites.includes(id)
        set((s) => ({
          favorites: exists ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
        }))
        return !exists
      },

      addListing: (input) => {
        const id = `l-${Date.now()}`
        const user = get().users.find((u) => u.id === get().currentUserId)
        const listing: Listing = {
          id,
          title: input.title,
          type: input.type ?? 'Apartment',
          layout: input.layout ?? 'S+1',
          city: input.city ?? 'Ariana',
          neighbourhood: input.neighbourhood ?? 'Ariana Centre',
          address: input.address,
          rent: input.rent,
          surface: input.surface ?? 60,
          bedrooms: input.bedrooms ?? 1,
          bathrooms: input.bathrooms ?? 1,
          furnished: input.furnished ?? false,
          verified: user?.verified ?? false,
          nearMetro: input.nearMetro ?? true,
          quiet: input.quiet ?? true,
          photos: input.photos ?? [],
          ownerId: get().currentUserId ?? 'youssef',
          status: 'pending',
          createdAt: new Date().toISOString().slice(0, 10),
          description: input.description ?? '',
          amenities: input.amenities ?? [],
          availableFrom: input.availableFrom ?? new Date().toISOString().slice(0, 10),
          deposit: input.deposit ?? input.rent,
          rating: 0,
          views: 0,
          saves: 0,
          interested: 0,
          qualityScore: input.qualityScore ?? 70,
          reference: `HOM-${Math.floor(Math.random() * 90 + 10)}`,
        }
        set((s) => ({ listings: [listing, ...s.listings] }))
        return id
      },

      updateListing: (id, patch) =>
        set((s) => ({
          listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),

      setListingStatus: (id, status) =>
        set((s) => ({
          listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)),
        })),

      startConversation: (userId, listingId, text) => {
        const me = get().currentUserId ?? 'amira'
        const existing = get().conversations.find(
          (c) =>
            c.participantIds.includes(me) &&
            c.participantIds.includes(userId) &&
            (!listingId || c.listingId === listingId),
        )
        if (existing) {
          if (text) get().sendMessage(existing.id, text)
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === existing.id ? { ...c, unread: 0 } : c,
            ),
          }))
          return existing.id
        }
        const id = `c-${Date.now()}`
        const conversation: Conversation = {
          id,
          participantIds: [me, userId],
          listingId,
          unread: 0,
          messages: text
            ? [{ id: `m-${Date.now()}`, from: 'me', text, at: 'Just now' }]
            : [],
        }
        set((s) => ({ conversations: [conversation, ...s.conversations] }))
        return id
      },

      sendMessage: (conversationId, text) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { id: `m-${Date.now()}`, from: 'me', text, at: 'Just now' },
                  ],
                }
              : c,
          ),
        })),

      markConversationRead: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, unread: 0 } : c,
          ),
        })),

      requestVisit: ({ listingId, message, moveIn }) =>
        set((s) => ({
          requests: [
            {
              id: `r-${Date.now()}`,
              tenantId: s.currentUserId ?? 'amira',
              listingId,
              message: `"${message}"`,
              moveIn,
              status: 'pending',
              createdAt: new Date().toISOString().slice(0, 10),
            },
            ...s.requests,
          ],
        })),

      respondRequest: (id, status) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),

      setAlertStatus: (id, status) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, status } : a)),
        })),

      markNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      setUserSuspended: (id, suspended) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, suspended } : u)),
        })),

      setLastSearch: (query) => set({ lastSearch: query }),

      resetDemo: () => set(seed()),
    }),
    { name: 'homey-demo-v1', version: 1 },
  ),
)

export const useCurrentUser = () => {
  const users = useDemo((s) => s.users)
  const id = useDemo((s) => s.currentUserId)
  return users.find((u) => u.id === id) ?? null
}

export const findUser = (users: DemoUser[], id?: string) => users.find((u) => u.id === id)

export const demoAccounts = demoUsers.filter((u) =>
  ['amira', 'youssef', 'sofia'].includes(u.id),
)
