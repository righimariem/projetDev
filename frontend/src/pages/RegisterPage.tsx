import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthResponse } from '../types'

// Inscription locataire ou propriétaire (US1.1)
export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', role: 'locataire',
  })
  const [erreur, setErreur] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => api.post<AuthResponse>('/auth/register/', form).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, { access: data.access, refresh: data.refresh })
      navigate('/')
    },
    onError: (err) => {
      const data = (err as { response?: { data?: Record<string, string[]> } }).response?.data
      setErreur(data ? Object.entries(data).map(([k, v]) => `${k} : ${v.join(', ')}`).join(' — ') : "Inscription impossible.")
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErreur('')
    mutation.mutate()
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border rounded-lg px-3 py-2"
        required={key !== 'email' && key !== 'first_name' && key !== 'last_name'}
      />
    </div>
  )

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white rounded-xl border border-gray-200 p-6">
      <h1 className="text-xl font-semibold mb-5">Créer un compte</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        {field('username', "Nom d'utilisateur")}
        {field('email', 'Email', 'email')}
        {field('first_name', 'Prénom')}
        {field('last_name', 'Nom')}
        {field('password', 'Mot de passe (8 min.)', 'password')}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Je suis</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="locataire">Locataire</option>
            <option value="proprietaire">Propriétaire</option>
          </select>
        </div>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Création…' : "S'inscrire"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Déjà inscrit ? <Link to="/connexion" className="text-teal-700">Connexion</Link>
      </p>
    </div>
  )
}
