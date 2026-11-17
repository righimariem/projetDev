import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Logement } from '../types'

const logement: Logement = {
  id: 7,
  type: 'appartement',
  titre: 'App Ariana F2',
  description: '',
  ville: 'Ariana',
  quartier: '',
  surface: 70,
  chambres: 2,
  sdb: 1,
  prix: 850,
  prix_par_m2: null,
  meuble: true,
  etat: 'bon',
  disponible_de: null,
  disponible_jusqua: null,
  statut: 'actif',
  equipements: [],
  photos: [],
  proprietaire: 1,
  proprietaire_nom: 'Nadia',
  created_at: '2026-01-01T00:00:00Z',
}

const reco = {
  logement,
  score: 92,
  pourquoi: ['À Ariana, la localisation recherchée'],
  explications: [
    { critere: 'Budget', points: 30, points_max: 30, satisfait: true,
      raison: '850 DT dans votre budget (700–900 DT)' },
    { critere: 'Localisation', points: 15, points_max: 15, satisfait: true,
      raison: 'À Ariana, la localisation recherchée' },
  ],
  favori: false,
}

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({
      data: { profil_complet: true, count: 1, resultats: [reco] },
    })),
  },
}))

import RecommandationsPage from './RecommandationsPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RecommandationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RecommandationsPage (F2 + F8)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche le score et les explications (F8)', async () => {
    renderPage()
    expect(await screen.findByText('App Ariana F2')).toBeInTheDocument()
    expect(screen.getByText('92 % compatible')).toBeInTheDocument()
    // F8 : « Pourquoi ce logement ? » ouvre le détail par critère
    await userEvent.click(screen.getByText(/Pourquoi ce logement/))
    expect(screen.getByText(/850 DT dans votre budget/)).toBeInTheDocument()
    expect(screen.getByText(/(30\/30 pts)/)).toBeInTheDocument()
  })
})
