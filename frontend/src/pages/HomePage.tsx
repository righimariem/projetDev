import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ListingCard from '../components/ListingCard'
import type { Logement, Paginated } from '../types'

// Page d'accueil : accroche + dernières annonces
export default function HomePage() {
  const { data } = useQuery({
    queryKey: ['logements', 'accueil'],
    queryFn: () =>
      api.get<Paginated<Logement>>('/logements/', { params: { ordering: '-created_at', page_size: 6 } })
        .then((r) => r.data),
  })

  return (
    <div className="space-y-10">
      <section className="bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-2xl p-10 text-center">
        <h1 className="text-3xl font-bold">Trouvez le logement qui vous correspond</h1>
        <p className="mt-3 text-teal-50">
          Recherche intelligente, recommandations personnalisées et colocataires compatibles.
        </p>
        <Link
          to="/recherche"
          className="mt-6 inline-block bg-white text-teal-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-teal-50"
        >
          Commencer la recherche
        </Link>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Dernières annonces</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.results.map((l) => (
            <ListingCard key={l.id} logement={l} />
          ))}
        </div>
      </section>
    </div>
  )
}
