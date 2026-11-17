import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { Logement } from '../types'

// ---------- Types de l'API Sprint 5 ----------

interface ResumeUser {
  id: number
  username: string
  first_name: string
  last_name: string
}

interface Explication {
  critere: string
  points: number
  points_max: number
  satisfait: boolean
  raison: string
}

interface Suggestion {
  profil: ResumeUser
  coloc: Record<string, unknown>
  score: number
  explications: Explication[]
  critères_communs: string[]
  critères_divergents: string[]
}

interface Proposition {
  id: number
  expediteur: ResumeUser
  destinataire: ResumeUser
  score: number
  explications: Explication[]
  statut: 'en_attente' | 'acceptee' | 'refusee'
  groupe_id: number | null
}

interface Membre {
  id: number
  user: ResumeUser
  profil: Record<string, unknown>
  statut: 'invite' | 'membre'
}

interface Groupe {
  id: number
  nom: string
  cree_par: ResumeUser
  membres: Membre[]
}

interface Invitation {
  membre_id: number
  groupe: Groupe
  invite_par: ResumeUser
}

interface RecoGroupe {
  logement: Logement
  score: number
  explications: Explication[]
}

// ---------- Petits composants partagés ----------

function ListeExplications({ explications }: { explications: Explication[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {explications.map((e) => (
        <li key={e.critere} className="flex items-start gap-2">
          <span>{e.satisfait ? '✅' : e.points > 0 ? '🟡' : '❌'}</span>
          <span className="text-gray-700">
            {e.raison}
            <span className="text-gray-400 ml-1">({e.points}/{e.points_max} pts)</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ---------- Page ----------

export default function ColocationPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const moiId = useAuthStore((s) => s.user?.id)
  const [onglet, setOnglet] = useState<'suggestions' | 'groupes'>('suggestions')
  const [groupeActif, setGroupeActif] = useState<number | null>(null)

  // F3 — préférences de colocation
  const prefsQuery = useQuery({
    queryKey: ['coloc-prefs'],
    queryFn: () => api.get<Record<string, unknown>>('/colocation/prefs/').then((r) => r.data),
  })
  const sauverPrefs = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch('/colocation/prefs/', patch).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['coloc-prefs'], data)
      qc.invalidateQueries({ queryKey: ['coloc-suggestions'] })
    },
  })

  // F4 — suggestions + propositions + invitations
  const suggestions = useQuery({
    queryKey: ['coloc-suggestions'],
    queryFn: () =>
      api.get<{ count: number; suggestions: Suggestion[] }>('/colocation/suggestions/').then((r) => r.data),
  })
  const propositions = useQuery({
    queryKey: ['coloc-propositions'],
    queryFn: () => api.get<Proposition[]>('/colocation/propositions/').then((r) => r.data),
  })
  const invitations = useQuery({
    queryKey: ['coloc-invitations'],
    queryFn: () =>
      api.get<{ count: number; invitations: Invitation[] }>('/colocation/invitations/').then((r) => r.data),
  })
  const groupes = useQuery({
    queryKey: ['groupes'],
    queryFn: () => api.get<Groupe[]>('/groupes/').then((r) => r.data),
  })

  const invalider = () => {
    qc.invalidateQueries({ queryKey: ['coloc-propositions'] })
    qc.invalidateQueries({ queryKey: ['coloc-suggestions'] })
    qc.invalidateQueries({ queryKey: ['coloc-invitations'] })
    qc.invalidateQueries({ queryKey: ['groupes'] })
  }

  const proposer = useMutation({
    mutationFn: (destinataire_id: number) =>
      api.post('/colocation/propositions/', { destinataire_id }).then((r) => r.data),
    onSuccess: invalider,
  })
  const repondre = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      api.post(`/colocation/propositions/${id}/repondre/`, { action }).then((r) => r.data),
    onSuccess: invalider,
  })
  const creerGroupe = useMutation({
    mutationFn: () => api.post('/groupes/', { nom: 'Notre colocation' }).then((r) => r.data),
    onSuccess: (g: Groupe) => {
      invalider()
      setGroupeActif(g.id)
      setOnglet('groupes')
    },
  })
  const inviter = useMutation({
    mutationFn: ({ groupe, user_id }: { groupe: number; user_id: number }) =>
      api.post(`/groupes/${groupe}/inviter/`, { user_id }).then((r) => r.data),
    onSuccess: invalider,
  })
  const repondreInvitation = useMutation({
    mutationFn: ({ membre_id, action }: { membre_id: number; action: string }) =>
      api.post(`/groupes/invitations/${membre_id}/repondre/`, { action }).then((r) => r.data),
    onSuccess: invalider,
  })

  // US9.3 : ouvrir la conversation de groupe
  const discuterGroupe = useMutation({
    mutationFn: (groupe_id: number) =>
      api.post<{ id: number }>('/conversations/', { groupe_id }).then((r) => r.data),
    onSuccess: (convo) => navigate(`/messages?conversation=${convo.id}`),
  })

  // F5 — recommandations du groupe actif
  const recosGroupe = useQuery({
    queryKey: ['groupe-recos', groupeActif],
    enabled: groupeActif !== null,
    queryFn: () =>
      api
        .get<{
          profil_groupe: { budget_total: number; nb_membres: number; ville: string }
          count: number
          resultats: RecoGroupe[]
        }>(`/groupes/${groupeActif}/recommandations/`)
        .then((r) => r.data),
  })

  const prefs = prefsQuery.data
  const nom = (u: ResumeUser) => u.first_name || u.username

  const propositionsEnAttente = propositions.data?.filter((p) => p.statut === 'en_attente') ?? []
  const idsProposes = new Set(propositions.data?.map((p) => p.destinataire.id) ?? [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Colocation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Décrivez votre mode de vie, trouvez des colocataires compatibles (score expliqué), constituez un groupe et recevez des logements adaptés à tous.
        </p>
      </div>

      {/* ---------- F3 : préférences ---------- */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold">Mes critères de colocation (F3)</h2>
        {prefsQuery.isError && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            La colocation est réservée aux comptes locataires.
          </p>
        )}
        {!prefs && !prefsQuery.isError && (
          <p className="text-gray-500 text-sm">Chargement…</p>
        )}
        {prefs && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <label className="block">
              <span className="text-gray-600">Je cherche</span>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={String(prefs.mode_recherche)}
                onChange={(e) => sauverPrefs.mutate({ mode_recherche: e.target.value })}
              >
                <option value="seul">Un logement seul</option>
                <option value="coloc">Une colocation</option>
                <option value="indefini">Indécis</option>
              </select>
            </label>
            <label className="block">
              <span className="text-gray-600">Budget par personne (DT)</span>
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                defaultValue={prefs.budget_max != null ? String(prefs.budget_max) : ''}
                onBlur={(e) =>
                  e.target.value && sauverPrefs.mutate({ budget_max: Number(e.target.value) })
                }
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Ville recherchée</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                defaultValue={String(prefs.ville ?? '')}
                onBlur={(e) => sauverPrefs.mutate({ ville: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(prefs.fumeur)}
                onChange={(e) => sauverPrefs.mutate({ fumeur: e.target.checked })}
              />
              Je fume
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(prefs.animaux)}
                onChange={(e) => sauverPrefs.mutate({ animaux: e.target.checked })}
              />
              Animaux acceptés
            </label>
            <label className="block">
              <span className="text-gray-600">Horaires</span>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={String(prefs.horaires)}
                onChange={(e) => sauverPrefs.mutate({ horaires: e.target.value })}
              >
                <option value="matin">Matin</option>
                <option value="soir">Soir</option>
                <option value="nuit">Nuit</option>
              </select>
            </label>
            <label className="block">
              <span className="text-gray-600">Propreté (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                defaultValue={String(prefs.niveau_proprete ?? 3)}
                onBlur={(e) => sauverPrefs.mutate({ niveau_proprete: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Tolérance au bruit (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                defaultValue={String(prefs.niveau_bruit ?? 3)}
                onBlur={(e) => sauverPrefs.mutate({ niveau_bruit: Number(e.target.value) })}
              />
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="text-gray-600">Habitudes de vie (séparées par des virgules)</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                defaultValue={String(prefs.habitudes ?? '')}
                placeholder="ex. calme, études, cuisine"
                onBlur={(e) => sauverPrefs.mutate({ habitudes: e.target.value })}
              />
            </label>
          </div>
        )}
        {sauverPrefs.isSuccess && <p className="text-sm text-green-600">Préférences enregistrées ✓</p>}
      </section>

      {/* ---------- Invitations de groupe en attente ---------- */}
      {(invitations.data?.count ?? 0) > 0 && (
        <section className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
          <h2 className="font-semibold text-sky-900">
            Invitations en attente ({invitations.data?.count})
          </h2>
          {invitations.data?.invitations.map((inv) => (
            <div key={inv.membre_id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <strong>{nom(inv.invite_par)}</strong> vous invite au groupe « {inv.groupe.nom} »
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => repondreInvitation.mutate({ membre_id: inv.membre_id, action: 'accepter' })}
                  className="bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700"
                >
                  Accepter
                </button>
                <button
                  onClick={() => repondreInvitation.mutate({ membre_id: inv.membre_id, action: 'refuser' })}
                  className="border px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Refuser
                </button>
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ---------- Onglets ---------- */}
      <div className="flex gap-2">
        <button
          onClick={() => setOnglet('suggestions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            onglet === 'suggestions' ? 'bg-teal-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          Colocataires compatibles
        </button>
        <button
          onClick={() => setOnglet('groupes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            onglet === 'groupes' ? 'bg-teal-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          Mes groupes ({groupes.data?.length ?? 0})
        </button>
      </div>

      {/* ---------- F4 : suggestions ---------- */}
      {onglet === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {suggestions.data?.count ?? 0} profil(s) compatible(s) — score expliqué critère par critère (F4/F8)
            </p>
            <button
              onClick={() => creerGroupe.mutate()}
              className="text-sm bg-white border px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              + Créer un groupe
            </button>
          </div>
          {suggestions.data?.suggestions.length === 0 && (
            <p className="text-gray-500">Aucun autre profil pour le moment — invitez des amis à s'inscrire !</p>
          )}
          {suggestions.data?.suggestions.map((s) => {
            const dejaPropose = idsProposes.has(s.profil.id)
            return (
              <article key={s.profil.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{nom(s.profil)}</h3>
                    <p className="text-sm text-gray-500">
                      {String(s.coloc.ville || 'Ville indifférente')} ·{' '}
                      {s.coloc.budget_max ? `${s.coloc.budget_max} DT/pers.` : 'budget libre'} ·{' '}
                      {s.coloc.fumeur ? 'fumeur' : 'non-fumeur'} ·{' '}
                      {String(s.coloc.horaires)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold bg-teal-600 text-white rounded-full px-3 py-1 shrink-0">
                    {s.score} % compatible
                  </span>
                </div>

                <details className="mt-3">
                  <summary className="text-sm text-sky-700 cursor-pointer hover:underline">
                    Pourquoi {nom(s.profil)} ? ({s.explications.length} critères évalués)
                  </summary>
                  <div className="mt-2">
                    <ListeExplications explications={s.explications} />
                    {s['critères_divergents'].length > 0 && (
                      <p className="mt-2 text-sm text-amber-700">
                        Points de vigilance : {s['critères_divergents'].join(' · ')}
                      </p>
                    )}
                  </div>
                </details>

                <div className="mt-3 flex gap-2">
                  <button
                    disabled={dejaPropose || proposer.isPending}
                    onClick={() => proposer.mutate(s.profil.id)}
                    className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-40"
                  >
                    {dejaPropose ? 'Proposition envoyée ✓' : 'Proposer un binôme'}
                  </button>
                  {groupes.data && groupes.data.length > 0 && (
                    <select
                      className="border rounded-lg px-2 py-1.5 text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value)
                          inviter.mutate({ groupe: Number(e.target.value), user_id: s.profil.id })
                        e.target.value = ''
                      }}
                    >
                      <option value="" disabled>
                        Inviter dans un groupe…
                      </option>
                      {groupes.data.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nom}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ---------- Groupes + F5 ---------- */}
      {onglet === 'groupes' && (
        <div className="space-y-4">
          {groupes.data?.length === 0 && (
            <p className="text-gray-500">
              Aucun groupe. Acceptez une proposition de binôme ou créez un groupe pour commencer.
            </p>
          )}
          {groupes.data?.map((g) => (
            <section key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{g.nom}</h2>
                <span className="flex gap-3">
                  <button
                    onClick={() => discuterGroupe.mutate(g.id)}
                    className="text-sm text-sky-700 hover:underline"
                  >
                    💬 Discuter
                  </button>
                  <button
                    onClick={() => setGroupeActif(groupeActif === g.id ? null : g.id)}
                    className="text-sm text-sky-700 hover:underline"
                  >
                    {groupeActif === g.id ? 'Masquer les recommandations' : 'Voir les recommandations du groupe'}
                  </button>
                </span>
              </div>

              <ul className="text-sm space-y-1">
                {g.membres.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <span>{m.statut === 'membre' ? '👤' : '✉️'}</span>
                    <span>
                      {nom(m.user)}{' '}
                      <span className="text-gray-400">
                        ({m.statut === 'membre' ? 'membre' : 'en attente'})
                        {m.profil?.budget_max ? ` · ${m.profil.budget_max} DT` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {groupeActif === g.id && recosGroupe.data && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm text-gray-600">
                    Budget combiné : <strong>{recosGroupe.data.profil_groupe.budget_total} DT</strong> (
                    {recosGroupe.data.profil_groupe.nb_membres} membres
                    {recosGroupe.data.profil_groupe.ville !== 'Indifférente'
                      ? ` · ${recosGroupe.data.profil_groupe.ville}`
                      : ''}
                    ) — F5 croise les besoins de tous les membres.
                  </p>
                  {recosGroupe.data.resultats.length === 0 && (
                    <p className="text-gray-500 text-sm">Aucune annonce active pour le moment.</p>
                  )}
                  {recosGroupe.data.resultats.map((r) => (
                    <article key={r.logement.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div>
                        <Link to={`/logements/${r.logement.id}`} className="font-medium hover:text-teal-700">
                          {r.logement.titre}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {r.logement.ville} · {r.logement.surface} m² · {r.logement.chambres} ch.
                        </p>
                        <details className="mt-1">
                          <summary className="text-sm text-sky-700 cursor-pointer hover:underline">
                            Pourquoi ce logement pour le groupe ?
                          </summary>
                          <div className="mt-2">
                            <ListeExplications explications={r.explications} />
                          </div>
                        </details>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-teal-700">{r.logement.prix} DT/mois</p>
                        <span className="text-sm font-semibold bg-teal-600 text-white rounded-full px-3 py-1">
                          {r.score} %
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* ---------- Propositions envoyées / reçues ---------- */}
      {propositionsEnAttente.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <h2 className="font-semibold">Propositions en attente de réponse</h2>
          {propositionsEnAttente.map((p) => {
            const recue = p.destinataire.id === moiId
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {nom(p.expediteur)} → {nom(p.destinataire)} · {p.score} % compatible
                  {recue ? '' : ' (envoyée)'}
                </span>
                {recue && (
                  <span className="flex gap-2">
                    <button
                      onClick={() => repondre.mutate({ id: p.id, action: 'accepter' })}
                      className="bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => repondre.mutate({ id: p.id, action: 'refuser' })}
                      className="border px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Refuser
                    </button>
                  </span>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
