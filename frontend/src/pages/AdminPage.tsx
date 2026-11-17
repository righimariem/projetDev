import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../api/client'
import type { Logement, Paginated } from '../types'

interface DashboardStats {
  utilisateurs: { total: number; locataires: number; proprietaires: number; suspends: number }
  annonces: { total: number; actives: number; en_attente: number; refusees: number; louees: number; prix_moyen: number }
  signalements: { nouveaux: number; traites: number }
}

interface Signalement {
  id: number
  signaleur_nom: string
  cible_type: 'annonce' | 'compte'
  cible_id: number
  motif: string
  statut: string
  created_at: string
}

interface AdminUser {
  id: number
  username: string
  email: string
  role: string
  is_suspended: boolean
}

interface Anomalie {
  id: number
  logement: number
  logement_titre: string
  logement_ville: string
  logement_prix: number
  prix_predit: number
  ecart_pct: number
  message: string
  statut: string
}

interface Incoherence {
  logement: { id: number; titre: string; ville: string; statut: string; proprietaire: string }
  score_qualite: number
  flag_anomalie: boolean
  message_anomalie: string
  incoherences: { code: string; message: string; gravite: string }[]
  analyse_le: string
}

// Administration (EPIC 4) : dashboard, modération, signalements, comptes
export default function AdminPage() {
  const [onglet, setOnglet] = useState<'dashboard' | 'moderation' | 'anomalies' | 'incoherences' | 'signalements' | 'utilisateurs'>('dashboard')
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<DashboardStats>('/admin/dashboard/').then((r) => r.data),
  })
  const { data: enAttente } = useQuery({
    queryKey: ['admin', 'moderation'],
    queryFn: () => api.get<Logement[]>('/admin/annonces/en-attente/').then((r) => r.data),
  })
  const { data: signalements } = useQuery({
    queryKey: ['admin', 'signalements'],
    queryFn: () => api.get<Paginated<Signalement>>('/admin/signalements/', { params: { statut: 'nouveau', page_size: 50 } }).then((r) => r.data),
  })
  const { data: anomalies } = useQuery({
    queryKey: ['admin', 'anomalies'],
    queryFn: () => api.get<Anomalie[]>('/admin/anomalies/', { params: { statut: 'a_verifier' } }).then((r) => r.data),
  })
  const { data: incoherences } = useQuery({
    queryKey: ['admin', 'incoherences'],
    queryFn: () => api.get<Incoherence[]>('/admin/annonces/incoherences/').then((r) => r.data),
    enabled: onglet === 'incoherences',
  })
  const { data: users } = useQuery({
    queryKey: ['admin', 'utilisateurs'],
    queryFn: () => api.get<Paginated<AdminUser>>('/admin/utilisateurs/', { params: { page_size: 50 } }).then((r) => r.data),
    enabled: onglet === 'utilisateurs',
  })

  const refreshAdmin = () => {
    qc.invalidateQueries({ queryKey: ['admin'] })
    qc.invalidateQueries({ queryKey: ['logements'] })
  }

  const decision = useMutation({
    mutationFn: ({ id, d, justification }: { id: number; d: 'accepte' | 'refuse'; justification: string }) =>
      api.post(`/admin/annonces/${id}/decision/`, { decision: d, justification }),
    onSuccess: refreshAdmin,
  })

  const traiter = useMutation({
    mutationFn: (id: number) => api.post(`/admin/signalements/${id}/traiter/`),
    onSuccess: refreshAdmin,
  })

  const suspension = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'suspendre' | 'reactiver' }) =>
      api.post(`/admin/utilisateurs/${id}/suspension/`, { action }),
    onSuccess: refreshAdmin,
  })

  const traiterAnomalie = useMutation({
    mutationFn: (id: number) => api.post(`/admin/anomalies/${id}/traiter/`),
    onSuccess: refreshAdmin,
  })

  const valider = (logement: Logement, d: 'accepte' | 'refuse') => {
    const justification = window.prompt(
      d === 'accepte' ? 'Justification de l’acceptation :' : 'Motif du refus (obligatoire) :',
    )
    if (!justification?.trim()) return
    decision.mutate({ id: logement.id, d, justification: justification.trim() })
  }

  const onglets = [
    ['dashboard', 'Tableau de bord'],
    ['moderation', `Modération (${enAttente?.length ?? 0})`],
    ['anomalies', `Anomalies IA (${anomalies?.length ?? 0})`],
    ['incoherences', `Incohérences (${incoherences?.length ?? 0})`],
    ['signalements', `Signalements (${signalements?.count ?? 0})`],
    ['utilisateurs', 'Utilisateurs'],
  ] as const

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administration</h1>

      <div className="flex gap-2 border-b border-gray-200 pb-2 text-sm">
        {onglets.map(([cle, label]) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            className={`px-3 py-1.5 rounded-lg ${onglet === cle ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {onglet === 'dashboard' && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Utilisateurs', stats.utilisateurs.total, `${stats.utilisateurs.locataires} locataires · ${stats.utilisateurs.proprietaires} propriétaires · ${stats.utilisateurs.suspends} suspendus`],
            ['Annonces actives', stats.annonces.actives, `${stats.annonces.total} au total · ${stats.annonces.en_attente} en attente · ${stats.annonces.refusees} refusées`],
            ['Prix moyen', `${Math.round(stats.annonces.prix_moyen)} DT`, 'annonces actives'],
            ['Signalements', stats.signalements.nouveaux, `${stats.signalements.nouveaux} nouveaux · ${stats.signalements.traites} traités`],
          ].map(([titre, valeur, sous]) => (
            <div key={String(titre)} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{titre}</p>
              <p className="text-2xl font-bold mt-1">{valeur}</p>
              <p className="text-xs text-gray-400 mt-1">{sous}</p>
            </div>
          ))}
        </div>
      )}

      {onglet === 'moderation' && (
        <div className="space-y-3">
          {(enAttente ?? []).length === 0 && <p className="text-gray-500">Aucune annonce en attente de validation.</p>}
          {(enAttente ?? []).map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{l.titre}</p>
                <p className="text-sm text-gray-500">
                  {l.ville} · {l.prix} DT · {l.surface} m² · {l.chambres} ch. · par {l.proprietaire_nom}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => valider(l, 'accepte')} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-700">
                  Accepter
                </button>
                <button onClick={() => valider(l, 'refuse')} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700">
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {onglet === 'anomalies' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Prix potentiellement inhabituels détectés par le ML (F7) — à vérifier, sans conclure à une fraude.
          </p>
          {(anomalies ?? []).length === 0 && <p className="text-gray-500">Aucune anomalie à vérifier. 🎉</p>}
          {(anomalies ?? []).map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-amber-200 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{a.logement_titre} <span className="text-gray-400 font-normal">({a.logement_ville})</span></p>
                <p className="text-sm text-gray-600 mt-1">
                  Demande <strong>{a.logement_prix} DT</strong> vs estimé <strong>{a.prix_predit} DT</strong>{' '}
                  <span className="text-red-600 font-medium">({a.ecart_pct > 0 ? '+' : ''}{a.ecart_pct} %)</span>
                </p>
              </div>
              <button
                onClick={() => traiterAnomalie.mutate(a.id)}
                className="border rounded-lg px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-700"
              >
                Vérifié
              </button>
            </div>
          ))}
        </div>
      )}

      {onglet === 'incoherences' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Incohérences potentielles entre le texte, les caractéristiques et les photos (US5.3) —
            à vérifier avant décision, ceci n'est pas une accusation.
          </p>
          {(incoherences ?? []).length === 0 && (
            <p className="text-gray-500">Aucune incohérence détectée. 🎉</p>
          )}
          {(incoherences ?? []).map((item) => (
            <div key={item.logement.id} className="bg-white rounded-xl border border-amber-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {item.logement.titre}{' '}
                    <span className="text-gray-400 font-normal">
                      ({item.logement.ville} · par {item.logement.proprietaire})
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Score qualité : <strong>{item.score_qualite}/100</strong>
                    {item.flag_anomalie && (
                      <span className="ml-2 text-amber-700">⚠ {item.message_anomalie}</span>
                    )}
                  </p>
                </div>
                <Link to={`/logements/${item.logement.id}`} className="text-sm text-sky-700 hover:underline shrink-0">
                  Voir l'annonce →
                </Link>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {item.incoherences.map((inc) => (
                  <li key={inc.code} className="flex items-start gap-2">
                    <span>{inc.gravite === 'moyenne' ? '🟡' : '🔵'}</span>
                    <span className="text-gray-700">{inc.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {onglet === 'signalements' && (
        <div className="space-y-3">
          {(signalements?.results ?? []).length === 0 && <p className="text-gray-500">Aucun signalement nouveau.</p>}
          {(signalements?.results ?? []).map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm">
                  <span className="font-medium">{s.signaleur_nom}</span> signale une {s.cible_type} #{s.cible_id}
                </p>
                <p className="text-sm text-gray-600 mt-1">{s.motif}</p>
              </div>
              <button
                onClick={() => traiter.mutate(s.id)}
                className="border rounded-lg px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-700"
              >
                Marquer traité
              </button>
            </div>
          ))}
        </div>
      )}

      {onglet === 'utilisateurs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Utilisateur</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Rôle</th>
                <th className="text-left px-4 py-2">Statut</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(users?.results ?? []).map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2 text-gray-500">{u.email || '—'}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">
                    <span className={u.is_suspended ? 'text-red-600' : 'text-teal-700'}>
                      {u.is_suspended ? 'Suspendu' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => suspension.mutate({ id: u.id, action: u.is_suspended ? 'reactiver' : 'suspendre' })}
                        className={`px-3 py-1 rounded-lg text-xs border ${u.is_suspended ? 'hover:border-teal-600 hover:text-teal-700' : 'hover:border-red-600 hover:text-red-600'}`}
                      >
                        {u.is_suspended ? 'Réactiver' : 'Suspendre'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
