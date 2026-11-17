import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Logement } from '../types'

interface Explication {
  critere: string
  points: number
  points_max: number
  satisfait: boolean
  raison: string
}

interface Reco {
  logement: Logement
  score: number
  pourquoi: string[]
  explications: Explication[]
  favori: boolean
}

// F2 + F8 : recommandations expliquées (« Pourquoi ce logement ? »)
export default function RecommandationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get<{ resultats: Reco[]; profil_complet: boolean }>('/recommendations/').then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pour vous</h1>
        <p className="text-gray-500 text-sm mt-1">
          Recommandations calculées selon vos préférences (budget, localisation, chambres…)
        </p>
      </div>

      {data && !data.profil_complet && (
        <p className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          ⚠ Votre profil est incomplet — complétez vos préférences pour des recommandations précises.
        </p>
      )}

      {isLoading && <p className="text-gray-500">Calcul des recommandations…</p>}
      {data && data.resultats.length === 0 && (
        <p className="text-gray-500">Aucune annonce disponible pour le moment.</p>
      )}

      <div className="space-y-4">
        {data?.resultats.map((r) => (
          <article key={r.logement.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <Link to={`/logements/${r.logement.id}`} className="sm:w-48 h-40 sm:h-auto bg-gradient-to-br from-teal-100 to-sky-100 flex items-center justify-center text-4xl shrink-0">
                🏡
              </Link>
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/logements/${r.logement.id}`} className="font-semibold hover:text-teal-700">
                      {r.logement.titre}
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {r.logement.ville} · {r.logement.surface} m² · {r.logement.chambres} ch.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-teal-700">{r.logement.prix} DT/mois</p>
                    <span className="inline-block mt-1 text-sm font-semibold bg-teal-600 text-white rounded-full px-3 py-1">
                      {r.score} % compatible
                    </span>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="text-sm text-sky-700 cursor-pointer hover:underline">
                    Pourquoi ce logement ? ({r.explications.length} critères évalués)
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {r.explications.map((e) => (
                      <li key={e.critere} className="flex items-start gap-2">
                        <span>{e.satisfait ? '✅' : e.points > 0 ? '🟡' : '❌'}</span>
                        <span className="text-gray-700">
                          {e.raison}
                          <span className="text-gray-400 ml-1">({e.points}/{e.points_max} pts)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-gray-600">
                    Score final : <strong>{r.score} %</strong> — {r.pourquoi.length} points forts.
                  </p>
                </details>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
