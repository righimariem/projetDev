import { create } from 'zustand'
import type { User } from '../types'

interface Tokens {
  access: string
  refresh: string
}

interface AuthState {
  user: User | null
  tokens: Tokens | null
  setAuth: (user: User, tokens: Tokens) => void
  setTokens: (tokens: Tokens) => void
  logout: () => void
}

// Session persistée dans localStorage
const saved = localStorage.getItem('homey_auth')

export const useAuthStore = create<AuthState>((set) => ({
  user: saved ? JSON.parse(saved).user : null,
  tokens: saved ? JSON.parse(saved).tokens : null,
  setAuth: (user, tokens) => {
    localStorage.setItem('homey_auth', JSON.stringify({ user, tokens }))
    set({ user, tokens })
  },
  setTokens: (tokens) => {
    const user = useAuthStore.getState().user
    localStorage.setItem('homey_auth', JSON.stringify({ user, tokens }))
    set({ tokens })
  },
  logout: () => {
    localStorage.removeItem('homey_auth')
    set({ user: null, tokens: null })
  },
}))
