import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth'
import type { User } from '../types'

const user: User = {
  id: 1, username: 'mariem', email: 'm@tn.tn', first_name: 'Mariem',
  last_name: 'Righi', role: 'locataire', telephone: '20000000',
  is_suspended: false,
}

describe('store auth (session JWT)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().logout()
  })

  it('stocke les tokens et l’utilisateur dans localStorage', () => {
    useAuthStore.getState().setAuth(user, { access: 'a', refresh: 'r' })
    const sauve = JSON.parse(localStorage.getItem('homey_auth')!)
    expect(sauve.tokens.access).toBe('a')
    expect(sauve.user.username).toBe('mariem')
  })

  it('setTokens conserve l’utilisateur courant', () => {
    useAuthStore.getState().setAuth(user, { access: 'a', refresh: 'r' })
    useAuthStore.getState().setTokens({ access: 'a2', refresh: 'r2' })
    expect(useAuthStore.getState().user?.username).toBe('mariem')
    expect(useAuthStore.getState().tokens?.access).toBe('a2')
  })

  it('logout efface session et stockage', () => {
    useAuthStore.getState().setAuth(user, { access: 'a', refresh: 'r' })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('homey_auth')).toBeNull()
  })
})
