import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { api } from '../api/client'

interface Resultat {
  prix_estime: number
  intervalle_bas: number
  intervalle_haut: number
  metriques: { mae: number | null; r2: number | null; mae_pct_median: number | null }
}

// F6 : estimation du prix d'un logement par le modèle ML
export default function EstimerPrixPage() {
  const [resultat, setResultat] = useState<Resultat | null>(null)
  const [erreur, setErreur] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Resultat>('/estimate-price/', payload).then((r) => r.data),
    onSuccess: (data) => {
      setResultat(data)
      setErreur('')
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { detail?: string } } }).response?.data
      setErreur(data?.detail ?? "Estimation impossible.")
    },
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      ville: fd.get('ville') || 'Tunis',
      type: fd.get('type'),
      etat: fd.get('etat'),
      meuble: fd.get('meuble') === 'on',
      surface: Number(fd.get('surface')),
      chambres: Number(fd.get('chambres')),
      sdb: Number(fd.get('sdb')),
      nb_equipements: Number(fd.get('nb_equipements')),
    })
  }

  const input = 'w-full border rounded-lg px-3 py-2 text-sm'
  const label = 'block text-sm text-gray-600 mb-1'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estimer un prix</h1>
        <p className="text-gray-500 text-sm mt-1">
          Le modèle ML (F6) estime le loyer mensuel à partir des caractéristiques du bien.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-gray-200 p-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Ville</label>
          <select name="ville" className={input} defaultValue="Ariana">
            {['Tunis', 'Ariana', 'La Marsa', 'Sfax', 'Sousse', 'Monastir', 'Bizerte', 'Gabès', 'Nabeul', 'Djerba'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Type</label>
          <select name="type" className={input} defaultValue="appartement">
            <option value="appartement">Appartement</option>
            <option value="maison">Maison</option>
            <option value="chambre">Chambre</option>
          </select>
        </div>
        <div>
          <label className={label}>Surface (m²) *</label>
          <input type="number" name="surface" min={1} defaultValue={100} className={input} required />
        </div>
        <div>
          <label className={label}>Chambres</label>
          <input type="number" name="chambres" min={0} defaultValue={2} className={input} />
        </div>
        <div>
          <label className={label}>Salles de bain</label>
          <input type="number" name="sdb" min={0} defaultValue={1} className={input} />
        </div>
        <div>
          <label className={label}>État</label>
          <select name="etat" className={input} defaultValue="bon">
            <option value="neuf">Neuf</option>
            <option value="bon">Bon état</option>
            <option value="a_renover">À rénover</option>
          </select>
        </div>
        <div>
          <label className={label}>Équipements (nombre)</label>
          <input type="number" name="nb_equipements" min={0} max={10} defaultValue={4} className={input} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <input type="checkbox" name="meuble" id="meuble-est" defaultChecked />
          <label htmlFor="meuble-est" className="text-sm">Meublé</label>
        </div>

        {erreur && <p className="sm:col-span-2 text-sm text-red-600">{erreur}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Calcul en cours…' : 'Estimer le prix'}
          </button>
        </div>
      </form>

      {resultat && (
        <section className="bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-xl p-6 text-center">
          <p className="text-sm text-teal-50">Prix estimé</p>
          <p className="text-4xl font-bold mt-1">{resultat.prix_estime} DT/mois</p>
          <p className="text-sm text-teal-50 mt-2">
            Fourchette plausible : {resultat.intervalle_bas} – {resultat.intervalle_haut} DT/mois
          </p>
          {resultat.metriques.mae_pct_median != null && (
            <p className="text-xs text-teal-100 mt-3">
              Modèle : erreur moyenne {resultat.metriques.mae} DT ({resultat.metriques.mae_pct_median} % du prix médian)
            </p>
          )}
          <p className="text-xs text-teal-100 mt-1">
            Utile au propriétaire pour fixer un prix cohérent, au client pour juger si le prix demandé est raisonnable.
          </p>
        </section>
      )}
    </div>
  )
}
