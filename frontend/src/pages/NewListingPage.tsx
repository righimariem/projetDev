import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

// Publication d'annonce propriétaire (US2.1) + description assistée IA (US5.1)
export default function NewListingPage() {
  const navigate = useNavigate()
  const [erreur, setErreur] = useState('')
  const [description, setDescription] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  // US5.1 : brouillon de description généré à partir des champs saisis
  const descriptionIA = useMutation({
    mutationFn: () => {
      const fd = new FormData(formRef.current!)
      const equipements = String(fd.get('equipements_text') ?? '')
        .split(',').map((s) => s.trim()).filter(Boolean)
      return api.post<{ description: string }>('/describe-listing/', {
        type: fd.get('type'), ville: fd.get('ville'), quartier: fd.get('quartier'),
        surface: fd.get('surface'), chambres: fd.get('chambres'), sdb: fd.get('sdb'),
        prix: fd.get('prix'), meuble: fd.get('meuble') === 'true', etat: fd.get('etat'),
        equipements,
      }).then((r) => r.data)
    },
    onSuccess: (data) => setDescription(data.description),
    onError: () => setErreur('Génération de description impossible pour le moment.'),
  })

  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const data = Object.fromEntries(form) as Record<string, unknown>
      // L'API attend equipements : string[] (noms)
      const text = String(data.equipements_text ?? '').trim()
      delete data.equipements_text
      if (text) data.equipements = text.split(',').map((s) => s.trim()).filter(Boolean)
      return api.post('/logements/', data).then((r) => r.data)
    },
    onSuccess: (data) => navigate(`/logements/${data.id}`),
    onError: (err) => {
      const resp = (err as { response?: { data?: Record<string, string[]> } }).response?.data
      setErreur(resp ? Object.entries(resp).map(([k, v]) => `${k} : ${v.join(', ')}`).join(' — ') : 'Publication impossible.')
    },
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErreur('')
    mutation.mutate(new FormData(e.currentTarget))
  }

  const input = 'w-full border rounded-lg px-3 py-2 text-sm'
  const label = 'block text-sm text-gray-600 mb-1'

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
      <h1 className="text-xl font-semibold mb-5">Publier une annonce</h1>
      <form ref={formRef} onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label}>Titre</label>
          <input name="titre" className={input} placeholder="ex. Appartement lumineux à Ariana" required />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Description</label>
          <textarea
            name="description"
            rows={5}
            className={input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Racontez le logement… ou laissez l'IA rédiger un brouillon"
          />
          <button
            type="button"
            onClick={() => descriptionIA.mutate()}
            disabled={descriptionIA.isPending}
            className="mt-2 text-sm border border-sky-300 text-sky-700 rounded-lg px-3 py-1.5 hover:bg-sky-50 disabled:opacity-50"
          >
            {descriptionIA.isPending ? 'Rédaction…' : '✨ Générer avec l’IA à partir des caractéristiques'}
          </button>
        </div>
        <div>
          <label className={label}>Type</label>
          <select name="type" className={input}>
            <option value="appartement">Appartement</option>
            <option value="maison">Maison</option>
            <option value="chambre">Chambre</option>
          </select>
        </div>
        <div>
          <label className={label}>Ville</label>
          <input name="ville" className={input} placeholder="ex. Ariana" required />
        </div>
        <div>
          <label className={label}>Quartier</label>
          <input name="quartier" className={input} />
        </div>
        <div>
          <label className={label}>Prix (DT/mois)</label>
          <input type="number" name="prix" min={1} className={input} required />
        </div>
        <div>
          <label className={label}>Surface (m²)</label>
          <input type="number" name="surface" min={1} className={input} required />
        </div>
        <div>
          <label className={label}>Chambres</label>
          <input type="number" name="chambres" min={0} className={input} defaultValue={1} />
        </div>
        <div>
          <label className={label}>Salles de bain</label>
          <input type="number" name="sdb" min={0} className={input} defaultValue={1} />
        </div>
        <div>
          <label className={label}>État</label>
          <select name="etat" className={input}>
            <option value="neuf">Neuf</option>
            <option value="bon" selected>Bon état</option>
            <option value="a_renover">À rénover</option>
          </select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <input type="checkbox" name="meuble" value="true" id="meuble-new" />
          <label htmlFor="meuble-new" className="text-sm">Meublé</label>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Équipements (séparés par des virgules)</label>
          <input name="equipements_text" className={input} placeholder="ex. Wifi, Climatisation, Parking" />
        </div>
        {erreur && <p className="sm:col-span-2 text-sm text-red-600">{erreur}</p>}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Publication…' : "Publier l'annonce"}
          </button>
        </div>
      </form>
    </div>
  )
}
