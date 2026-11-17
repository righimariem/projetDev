import { Link } from 'react-router-dom'
import type { Logement } from '../types'

// Carte d'annonce pour les grilles de résultats (F1)
export default function ListingCard({ logement }: { logement: Logement }) {
  const photo = logement.photos[0]?.image
  return (
    <Link
      to={`/logements/${logement.id}`}
      className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
    >
      {photo ? (
        <img src={photo} alt={logement.titre} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-teal-100 to-sky-100 flex items-center justify-center text-4xl">
          🏡
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{logement.titre}</h3>
          <span className="whitespace-nowrap font-bold text-teal-700">
            {logement.prix} DT<span className="text-xs font-normal text-gray-400">/mois</span>
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {logement.quartier ? `${logement.quartier}, ` : ''}{logement.ville}
        </p>
        <p className="text-sm text-gray-600 mt-2 flex gap-3">
          <span>🛏 {logement.chambres}</span>
          <span>📐 {logement.surface} m²</span>
          {logement.meuble && <span>🪑 Meublé</span>}
        </p>
        {logement.equipements.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 truncate">
            {logement.equipements.slice(0, 4).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  )
}
