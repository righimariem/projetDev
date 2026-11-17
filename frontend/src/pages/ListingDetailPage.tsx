import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { Logement } from '../types'

// Fiche logement détaillée (US3.2) + favori (US3.5)
export default function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data: logement, isLoading } = useQuery({
    queryKey: ['logement', id],
    queryFn: () => api.get<Logement>(`/logements/${id}/`).then((r) => r.data),
  })

  const [motif, setMotif] = useState('')
  const [signale, setSignale] = useState(false)

  const signaler = useMutation({
    mutationFn: () =>
      api.post('/signalements/', { cible_type: 'annonce', cible_id: Number(id), motif }),
    onSuccess: () => {
      setSignale(true)
      setMotif('')
    },
    onError: () => navigate('/connexion', { state: { from: `/logements/${id}` } }),
  })

  const soumettre = useMutation({
    mutationFn: () => api.post(`/logements/${id}/submit/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logement', id] }),
  })

  // F6/F7 : prix estimé par le modèle pour cette annonce
  const { data: priceCheck } = useQuery({
    queryKey: ['price-check', id],
    queryFn: () => api.get<{
      prix_demande: number
      prix_estime: number
      intervalle: [number, number]
      ecart_pct: number
      anomalie: { message: string } | null
    }>(`/logements/${id}/price-check/`).then((r) => r.data),
    enabled: !!user && !!id,
    retry: false,
  })

  const favoriMutation = useMutation({
    mutationFn: () => api.post(`/logements/${id}/favori/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logement', id] }),
    onError: () => navigate('/connexion', { state: { from: `/logements/${id}` } }),
  })

  // US9.1 : contacter le propriétaire → ouvre une conversation directe
  const contactMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ id: number }>('/conversations/', {
          destinataire_id: logement?.proprietaire,
          logement_id: Number(id),
        })
        .then((r) => r.data),
    onSuccess: (convo) => navigate(`/messages?conversation=${convo.id}`),
    onError: () => navigate('/connexion', { state: { from: `/logements/${id}` } }),
  })

  if (isLoading) return <p className="text-gray-500">Chargement…</p>
  if (!logement) return <p className="text-gray-500">Annonce introuvable.</p>

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      {logement.photos.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 rounded-xl overflow-hidden">
          {logement.photos.map((p) => (
            <img key={p.id} src={p.image} alt={logement.titre} className="w-full h-64 object-cover" />
          ))}
        </div>
      ) : (
        <div className="h-56 bg-gradient-to-br from-teal-100 to-sky-100 rounded-xl flex items-center justify-center text-6xl">
          🏡
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{logement.titre}</h1>
          <p className="text-gray-500 mt-1">
            {logement.quartier ? `${logement.quartier}, ` : ''}{logement.ville}
            {logement.prix_par_m2 && <span className="ml-2 text-sm text-gray-400">≈ {logement.prix_par_m2} DT/m²</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-teal-700">{logement.prix} DT/mois</p>
          <button
            onClick={() => favoriMutation.mutate()}
            disabled={favoriMutation.isPending}
            className="mt-2 text-sm border rounded-lg px-3 py-1.5 hover:border-teal-600 hover:text-teal-700"
          >
            ♥ Ajouter aux favoris
          </button>
          {user && user.id !== logement.proprietaire && (
            <button
              onClick={() => contactMutation.mutate()}
              disabled={contactMutation.isPending}
              className="mt-2 block w-full text-sm border rounded-lg px-3 py-1.5 hover:border-teal-600 hover:text-teal-700"
            >
              ✉️ Contacter le propriétaire
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Type', logement.type],
          ['Surface', `${logement.surface} m²`],
          ['Chambres', `${logement.chambres}`],
          ['Salle(s) de bain', `${logement.sdb}`],
          ['État', logement.etat],
          ['Meublé', logement.meuble ? 'Oui' : 'Non'],
          ['Disponible', logement.disponible_de ?? '—'],
          ['Publié par', logement.proprietaire_nom],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-medium capitalize">{value}</p>
          </div>
        ))}
      </div>

      {logement.description && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{logement.description}</p>
        </section>
      )}

      {logement.equipements.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Équipements</h2>
          <div className="flex flex-wrap gap-2">
            {logement.equipements.map((e) => (
              <span key={e} className="bg-teal-50 text-teal-800 text-sm rounded-full px-3 py-1">{e}</span>
            ))}
          </div>
        </section>
      )}

      {priceCheck && (
        <section className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
          <h2 className="font-semibold mb-2">💡 Avis du modèle ML sur ce prix</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-gray-700">
            <span>Prix demandé : <strong>{priceCheck.prix_demande} DT</strong></span>
            <span>Prix estimé : <strong>{priceCheck.prix_estime} DT</strong>
              <span className="text-gray-400"> (± modèle)</span>
            </span>
            <span className={priceCheck.ecart_pct > 50 || priceCheck.ecart_pct < -50 ? 'text-red-600 font-medium' : 'text-teal-700'}>
              Écart : {priceCheck.ecart_pct > 0 ? '+' : ''}{priceCheck.ecart_pct} %
            </span>
          </div>
          {priceCheck.anomalie && (
            <p className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              ⚠ {priceCheck.anomalie.message} — une anomalie ne signifie pas que l'annonce est frauduleuse.
            </p>
          )}
        </section>
      )}

      {user && logement.proprietaire === user.id && (logement.statut === 'brouillon' || logement.statut === 'refuse') && (
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center justify-between text-sm text-amber-900">
          <span>Cette annonce n'est pas publiée{logement.statut === 'refuse' ? ' (refusée par la modération)' : ''}.</span>
          <button
            onClick={() => soumettre.mutate()}
            disabled={soumettre.isPending}
            className="bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            Soumettre à la validation
          </button>
        </section>
      )}

      {user && user.role === 'locataire' && (
        <section className="bg-sky-50 rounded-xl border border-sky-200 p-5 text-sm text-sky-900">
          💡 Bientôt : contactez le propriétaire par chat et recevez des recommandations expliquées (F2/F8).
        </section>
      )}

      {user && user.role !== 'proprietaire' && (
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold mb-2">Signaler cette annonce</h2>
          {signale ? (
            <p className="text-sm text-teal-700">Merci, votre signalement a été transmis à la modération.</p>
          ) : (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (motif.trim()) signaler.mutate()
              }}
              className="flex gap-2"
            >
              <input
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Décrivez le problème (infos fausses, prix suspect…)"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                required
              />
              <button
                type="submit"
                disabled={signaler.isPending}
                className="border rounded-lg px-3 py-2 text-sm text-red-600 hover:border-red-600 disabled:opacity-50"
              >
                Signaler
              </button>
            </form>
          )}
        </section>
      )}
    </article>
  )
}
