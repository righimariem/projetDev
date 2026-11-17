import { ArrowUpRight, Bath, BedDouble, Heart, MapPin, Ruler, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Listing } from './types'
import { cn, money } from './lib'
import { useDemo } from './store'
import { Badge } from './ui'

export default function ListingCard({
  listing,
  score,
  compact = false,
}: {
  listing: Listing
  score?: number
  compact?: boolean
}) {
  const favorites = useDemo((s) => s.favorites)
  const toggleFavorite = useDemo((s) => s.toggleFavorite)
  const saved = favorites.includes(listing.id)

  return (
    <article className="group card card-hover overflow-hidden">
      <div className="relative overflow-hidden">
        <Link to={`/properties/${listing.id}`} className="block">
          <img
            src={listing.photos[0] ?? '/photos/living-1.jpg'}
            alt={listing.title}
            className={cn(
              'w-full object-cover transition duration-500 group-hover:scale-[1.02]',
              compact ? 'h-40' : 'h-[210px]',
            )}
            loading="lazy"
          />
        </Link>
        <div className="pointer-events-none absolute top-3 left-3 flex gap-1.5">
          {listing.verified && <Badge tone="outline">Verified</Badge>}
          {listing.furnished && <Badge tone="outline">Furnished</Badge>}
        </div>
        <button
          onClick={() => toggleFavorite(listing.id)}
          aria-label={saved ? 'Remove from saved' : 'Save home'}
          className={cn(
            'absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105',
            saved ? 'text-clay' : 'text-muted',
          )}
        >
          <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {score !== undefined && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-medium text-forest shadow-sm">
            <Sparkles size={10} /> {score}% match
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between text-[10px] font-semibold tracking-[0.13em] text-muted uppercase">
          <span>
            {listing.type} · {listing.layout}
          </span>
          <span className="inline-flex items-center gap-1 font-medium tracking-normal text-clay normal-case">
            <Star size={10} fill="currentColor" /> {listing.rating.toFixed(1)}
          </span>
        </div>
        <Link to={`/properties/${listing.id}`}>
          <h3 className="mt-1.5 truncate text-[15px] font-medium text-ink hover:text-forest">
            {listing.title}
          </h3>
        </Link>
        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
          <MapPin size={11} /> {listing.neighbourhood}, {listing.city}
        </p>

        <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-lg border border-line-soft bg-[#fcfbf6] py-2 text-[10.5px] text-muted">
          <span className="flex items-center justify-center gap-1">
            <BedDouble size={12} /> {listing.bedrooms} bed
          </span>
          <span className="flex items-center justify-center gap-1">
            <Ruler size={12} /> {listing.surface} m²
          </span>
          <span className="flex items-center justify-center gap-1">
            <Bath size={12} /> {listing.bathrooms}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <p className="text-[15px] font-semibold">
            {money(listing.rent)}
            <span className="ml-0.5 text-[9.5px] font-normal tracking-wide text-muted uppercase">
              /month
            </span>
          </p>
          <Link
            to={`/properties/${listing.id}`}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted hover:text-forest"
          >
            Details <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </article>
  )
}
