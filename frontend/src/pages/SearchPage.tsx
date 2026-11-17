import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import ListingCard from '../components/ListingCard'
import type { FiltresRecherche, Logement, Paginated } from '../types'

const VILLES = ['Tunis', 'Ariana', 'La Marsa', 'Sfax', 'Sousse', 'Monastir', 'Bizerte', 'Gabès', 'Nabeul', 'Djerba']

interface CritereNL {
  critere: string
  valeur: string | number | boolean
  source: string
}

interface ReponseNL {
  requete: string
  criteres: CritereNL[]
  filtres: FiltresRecherche
  interpretation_reussie: boolean
  count: number
  resultats: Logement[]
}

// Recherche F1 : filtres + tri + pagination + langage naturel (US6.1)
export default function SearchPage() {
  const [filtres, setFiltres] = useState<FiltresRecherche>({})
  const [page, setPage] = useState(1)
  const [phrase, setPhrase] = useState('')
  const [reponseNL, setReponseNL] = useState<ReponseNL | null>(null)
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const derniereRecherche = useRef<string>('')

  // US6.4 — profil comportemental : historiser les recherches des locataires connectés
  useEffect(() => {
    if (!user || Object.keys(filtres).length === 0) return
    const cle = JSON.stringify({ filtres, page })
    if (cle === derniereRecherche.current) return
    derniereRecherche.current = cle
    api.post('/recherches/', {
      filtres,
      nb_resultats: data?.count ?? 0,
    }).then(() => qc.invalidateQueries({ queryKey: ['recommendations'] })).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres, page, user])

  // US6.1 — « Décrivez votre recherche » → critères F1 interprétés par l'IA
  const rechercheNL = useMutation({
    mutationFn: (q: string) =>
      api.get<ReponseNL>('/search-natural/', { params: { q } }).then((r) => r.data),
    onSuccess: (data) => {
      setReponseNL(data)
      setFiltres(data.filtres)
      setPage(1)
      // US6.4 — on historise aussi la phrase en langage naturel
      if (user) {
        api.post('/recherches/', {
          requete: data.requete, filtres: data.filtres, nb_resultats: data.count,
        }).catch(() => {})
      }
    },
    onError: () => setReponseNL(null),
  })

  const params = { ...filtres, page }
  const { data, isLoading } = useQuery({
    queryKey: ['logements', 'recherche', params],
    queryFn: () =>
      api.get<Paginated<Logement>>('/logements/', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const next: FiltresRecherche = {}
    const ville = fd.get('ville'); if (typeof ville === 'string' && ville !== 'any') next.ville = ville
    const type = fd.get('type'); if (typeof type === 'string' && type !== 'any') next.type = type
    const ordering = fd.get('ordering'); if (typeof ordering === 'string') next.ordering = ordering
    const equip = fd.get('equipements'); if (typeof equip === 'string' && equip.trim()) next.equipements = equip.trim()
    const prixMax = fd.get('prix_max'); if (prixMax) next.prix_max = Number(prixMax)
    const chambres = fd.get('chambres_min'); if (chambres) next.chambres_min = Number(chambres)
    const surface = fd.get('surface_min'); if (surface) next.surface_min = Number(surface)
    if (fd.get('meuble') === 'true') next.meuble = true
    setFiltres(next)
    setPage(1)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 12)) : 1

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <aside className="bg-white rounded-xl border border-gray-200 p-4 h-fit">
        <h2 className="font-semibold mb-4">Filtres</h2>
        <form onSubmit={onSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Ville</label>
            <select name="ville" className="w-full border rounded-lg px-2 py-1.5">
              <option value="any">Toutes</option>
              {VILLES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Budget max (DT/mois)</label>
            <input type="number" name="prix_max" min={0} className="w-full border rounded-lg px-2 py-1.5" placeholder="ex. 900" />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Chambres min.</label>
            <input type="number" name="chambres_min" min={0} className="w-full border rounded-lg px-2 py-1.5" placeholder="ex. 2" />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Surface min. (m²)</label>
            <input type="number" name="surface_min" min={0} className="w-full border rounded-lg px-2 py-1.5" placeholder="ex. 60" />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Équipements</label>
            <input name="equipements" className="w-full border rounded-lg px-2 py-1.5" placeholder="ex. Climatisation,Wifi" />
            <p className="text-xs text-gray-400 mt-1">Séparés par des virgules</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="meuble" value="true" id="meuble" />
            <label htmlFor="meuble">Meublé</label>
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Trier par</label>
            <select name="ordering" className="w-full border rounded-lg px-2 py-1.5">
              <option value="-created_at">Plus récents</option>
              <option value="prix">Prix croissant</option>
              <option value="-prix">Prix décroissant</option>
              <option value="surface">Surface croissante</option>
            </select>
          </div>
          <button className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700">
            Rechercher
          </button>
        </form>
      </aside>

      <section>
        {/* US6.1 — recherche en langage naturel */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (phrase.trim().length >= 3) rechercheNL.mutate(phrase.trim())
          }}
          className="bg-white rounded-xl border border-gray-200 p-4 mb-5"
        >
          <label className="block text-sm font-medium mb-2">
            🧠 Décrivez votre recherche en une phrase
          </label>
          <div className="flex gap-2">
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="ex. Un appartement meublé à Ariana moins de 900 DT avec climatisation"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              disabled={rechercheNL.isPending || phrase.trim().length < 3}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-700 disabled:opacity-40"
            >
              {rechercheNL.isPending ? 'Analyse…' : 'Analyser'}
            </button>
          </div>
          {rechercheNL.isError && (
            <p className="text-sm text-amber-700 mt-2">
              Je n'ai pas compris cette phrase — reformulez avec ville, budget, chambres…
            </p>
          )}
          {reponseNL?.interpretation_reussie && (
            <div className="mt-3 text-sm">
              <p className="text-gray-600 mb-1">
                Critères compris de « {reponseNL.requete} » :
              </p>
              <div className="flex flex-wrap gap-2">
                {reponseNL.criteres.map((c) => (
                  <span
                    key={c.critere}
                    title={c.source}
                    className="bg-sky-50 border border-sky-200 text-sky-800 rounded-full px-3 py-1 text-xs"
                  >
                    {c.critere} : {String(c.valeur)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">
            {data ? `${data.count} logement${data.count > 1 ? 's' : ''}` : 'Recherche'}
          </h1>
        </div>
        {isLoading && <p className="text-gray-500">Chargement…</p>}
        {data && data.count === 0 && (
          <p className="text-gray-500 bg-white rounded-xl border p-6">Aucun logement ne correspond à ces critères.</p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.results.map((l) => <ListingCard key={l.id} logement={l} />)}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded border bg-white disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span className="text-gray-600">Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded border bg-white disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
