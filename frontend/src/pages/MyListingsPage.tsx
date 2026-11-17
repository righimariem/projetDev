import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Logement } from '../types'

interface Analyse {
  score_qualite: number
  points_forts: string[]
  points_faibles: string[]
  prix_estime: number | null
  flag_anomalie: boolean
  message_anomalie: string
}

const STATUT_BADGES: Record<string, { label: string; classe: string }> = {
  brouillon: { label: 'Brouillon', classe: 'bg-gray-100 text-gray-600' },
  en_attente: { label: 'En attente de validation', classe: 'bg-amber-100 text-amber-700' },
  actif: { label: 'Actif', classe: 'bg-teal-100 text-teal-700' },
  refuse: { label: 'Refusé', classe: 'bg-red-100 text-red-700' },
  loue: { label: 'Loué', classe: 'bg-sky-100 text-sky-700' },
  archive: { label: 'Archivé', classe: 'bg-gray-200 text-gray-500' },
}

// Mes annonces (US2.5) + soumission à la validation (US2.6)
export default function MyListingsPage() {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['logements', 'mes-annonces'],
    queryFn: () =>
      api.get<{ results: Logement[] }>('/logements/', { params: { mes: '1', page_size: 100 } })
        .then((r) => r.data.results),
  })

  const submit = useMutation({
    mutationFn: (id: number) => api.post(`/logements/${id}/submit/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logements', 'mes-annonces'] }),
  })

  // US5.4/US5.6 : l'analyse IA (score qualité) existe après soumission/analyse
  const analyser = useMutation({
    mutationFn: (id: number) => api.post(`/logements/${id}/analyze/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qualite'] }),
  })

  const { data: analyses } = useQuery({
    queryKey: ['qualite'],
    queryFn: async () => {
      const res: Record<number, Analyse | null> = {}
      for (const l of data ?? []) {
        try {
          res[l.id] = (await api.get<Analyse>(`/logements/${l.id}/qualite/`)).data
        } catch {
          res[l.id] = null // non analysée encore
        }
      }
      return res
    },
    enabled: (data ?? []).length > 0,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes annonces</h1>
        <Link to="/annonces/nouvelle" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700">
          + Publier une annonce
        </Link>
      </div>

      {(data ?? []).length === 0 && (
        <p className="text-gray-500 bg-white rounded-xl border border-gray-200 p-6">
          Vous n'avez pas encore d'annonce.
        </p>
      )}

      <div className="space-y-3">
        {(data ?? []).map((l) => {
          const badge = STATUT_BADGES[l.statut] ?? { label: l.statut, classe: 'bg-gray-100 text-gray-600' }
          const analyse = analyses?.[l.id] ?? null
          return (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
              <div>
                <Link to={`/logements/${l.id}`} className="font-medium hover:text-teal-700">{l.titre}</Link>
                <p className="text-sm text-gray-500 mt-0.5">
                  {l.ville} · {l.prix} DT · {l.surface} m²
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* US5.6 — score de qualité de l'annonce */}
                {analyse ? (
                  <span
                    title={analyse.points_faibles.join(' · ') || 'Annonce complète'}
                    className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                      analyse.score_qualite >= 70
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-amber-100 text-amber-700'}`}
                  >
                    Qualité {analyse.score_qualite}/100
                  </span>
                ) : (
                  <button
                    onClick={() => analyser.mutate(l.id)}
                    disabled={analyser.isPending}
                    className="text-xs border border-sky-300 text-sky-700 rounded-full px-2.5 py-1 hover:bg-sky-50 disabled:opacity-50"
                    title="Lancer l'analyse IA (score de qualité + incohérences)"
                  >
                    ✨ Analyser
                  </button>
                )}
                <span className={`text-xs rounded-full px-2.5 py-1 ${badge.classe}`}>{badge.label}</span>
                {(l.statut === 'brouillon' || l.statut === 'refuse' || l.statut === 'archive') && (
                  <button
                    onClick={() => submit.mutate(l.id)}
                    disabled={submit.isPending}
                    className="border rounded-lg px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-700 disabled:opacity-50"
                  >
                    Soumettre à la validation
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
