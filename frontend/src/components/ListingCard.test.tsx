import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ListingCard from './ListingCard'
import type { Logement } from '../types'

const logement: Logement = {
  id: 42,
  type: 'appartement',
  titre: 'Appartement lumineux à Ariana',
  description: '',
  ville: 'Ariana',
  quartier: 'Ennasr',
  surface: 80,
  chambres: 2,
  sdb: 1,
  prix: 950,
  prix_par_m2: 12,
  meuble: true,
  etat: 'bon',
  disponible_de: null,
  disponible_jusqua: null,
  statut: 'actif',
  equipements: ['Climatisation', 'Wifi'],
  photos: [],
  proprietaire: 1,
  proprietaire_nom: 'Nadia',
  created_at: '2026-01-01T00:00:00Z',
}

describe('ListingCard (F1)', () => {
  it('affiche titre, prix, ville et caractéristiques', () => {
    render(<MemoryRouter><ListingCard logement={logement} /></MemoryRouter>)
    expect(screen.getByText('Appartement lumineux à Ariana')).toBeInTheDocument()
    expect(screen.getByText(/950 DT/)).toBeInTheDocument()
    expect(screen.getByText(/Ennasr, Ariana/)).toBeInTheDocument()
    expect(screen.getByText(/🛏 2/)).toBeInTheDocument()
    expect(screen.getByText(/📐 80 m²/)).toBeInTheDocument()
    expect(screen.getByText('🪑 Meublé')).toBeInTheDocument()
    expect(screen.getByText('Climatisation · Wifi')).toBeInTheDocument()
  })

  it('affiche l’emoji placeholder sans photo', () => {
    render(<MemoryRouter><ListingCard logement={logement} /></MemoryRouter>)
    expect(screen.getByText('🏡')).toBeInTheDocument()
  })

  it('lien vers la fiche détaillée', () => {
    render(<MemoryRouter><ListingCard logement={logement} /></MemoryRouter>)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/logements/42')
  })
})
