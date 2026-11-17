import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthResponse } from '../types'

// Connexion (US1.2) : renvoie tokens JWT + profil
export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const mutation = useMutation({
    mutationFn: () =>
      api.post<AuthResponse>('/auth/login/', { username, password }).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, { access: data.access, refresh: data.refresh })
      navigate(location.state?.from ?? '/')
    },
    onError: () => setErreur("Identifiants incorrects."),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErreur('')
    mutation.mutate()
  }

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white rounded-xl border border-gray-200 p-6">
      <h1 className="text-xl font-semibold mb-5">Connexion</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Nom d'utilisateur</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Pas de compte ? <Link to="/inscription" className="text-teal-700">S'inscrire</Link>
      </p>
      <p className="text-xs text-gray-400 mt-4">
        Démo : demo_locataire / homey2026 — demo_proprietaire / homey2026
      </p>
    </div>
  )
}
