import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../store/auth'

// react-router v7 : Navigate/useLocation mockés (le routeur complet ne
// s'initialise pas proprement dans jsdom pour ce test purement garde-de-route)
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <p>Redirigé vers {to}</p>,
  useLocation: () => ({ pathname: '/pour-vous' }),
}))

import RequireAuth from './RequireAuth'

describe('RequireAuth (garde de routes)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().logout()
  })

  it('redirige vers /connexion sans session', () => {
    render(<RequireAuth><p>Contenu protégé</p></RequireAuth>)
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
    expect(screen.getByText('Redirigé vers /connexion')).toBeInTheDocument()
  })

  it('affiche le contenu avec une session', () => {
    useAuthStore.getState().setAuth(
      {
        id: 1, username: 'loc', email: '', first_name: '', last_name: '',
        role: 'locataire', telephone: '', is_suspended: false,
      },
      { access: 'a', refresh: 'r' },
    )
    render(<RequireAuth><p>Contenu protégé</p></RequireAuth>)
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })
})
