import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'

interface NotificationNotif {
  id: number
  type: string
  titre: string
  corps: string
  lien: string
  lue: boolean
  created_at: string
}

// Cloche de notifications (US9.6) : compteur + panneau déroulant
function ClocheNotifications() {
  const [ouvert, setOuvert] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    refetchInterval: 10_000,
    queryFn: () =>
      api
        .get<{ non_lues: number; notifications: NotificationNotif[] }>('/notifications/?toutes=1')
        .then((r) => r.data),
  })
  const marquerLu = async (id: number) => {
    await api.patch(`/notifications/${id}/lire/`, {})
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
  const toutLire = async () => {
    await api.post('/notifications/lues/', {})
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
  const nonLues = data?.non_lues ?? 0

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="relative text-gray-600 hover:text-teal-700 text-lg"
        title="Notifications"
      >
        🔔
        {nonLues > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1.5">
            {nonLues}
          </span>
        )}
      </button>
      {ouvert && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-30">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {nonLues > 0 && (
              <button onClick={toutLire} className="text-xs text-sky-700 hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data?.notifications.length === 0 && (
              <p className="text-sm text-gray-500 p-3">Aucune notification.</p>
            )}
            {data?.notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.lue) void marquerLu(n.id)
                  if (n.lien) navigate(n.lien)
                  setOuvert(false)
                }}
                className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-gray-50 ${
                  n.lue ? 'opacity-60' : 'bg-teal-50/40'
                }`}
              >
                <p className="text-sm font-medium">{n.titre}</p>
                {n.corps && <p className="text-xs text-gray-500 truncate">{n.corps}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(n.created_at).toLocaleString('fr-FR')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Layout commun : en-tête avec navigation + zone utilisateur
export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/" className="font-bold text-lg text-teal-700">
            🏠 HOMEY
          </Link>
          <nav className="flex gap-4 text-sm flex-1">
            <NavLink to="/recherche" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
              Rechercher
            </NavLink>
            {user && (
              <NavLink to="/pour-vous" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                Pour vous ✨
              </NavLink>
            )}
            {user && (
              <NavLink to="/estimer" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                Estimer un prix
              </NavLink>
            )}
            {user?.role === 'proprietaire' && (
              <>
                <NavLink to="/annonces/nouvelle" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                  Publier
                </NavLink>
                <NavLink to="/mes-annonces" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                  Mes annonces
                </NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                Administration
              </NavLink>
            )}
            {user && (
              <NavLink to="/favoris" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                Favoris
              </NavLink>
            )}
            {user?.role === 'locataire' && (
              <NavLink to="/colocation" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                Colocation
              </NavLink>
            )}
            {user && (
              <NavLink to="/messages" className={({ isActive }) => isActive ? 'text-teal-700 font-medium' : 'text-gray-600 hover:text-teal-700'}>
                Messages
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <ClocheNotifications />
                <span className="text-gray-600">
                  {user.first_name || user.username}
                  <span className="ml-1 text-xs text-gray-400">({user.role})</span>
                </span>
                <button
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="text-gray-500 hover:text-red-600"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="text-gray-600 hover:text-teal-700">Connexion</Link>
                <Link to="/inscription" className="bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700">
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-gray-400">
        HOMEY — Plateforme intelligente de logement et de colocation
      </footer>
    </div>
  )
}
