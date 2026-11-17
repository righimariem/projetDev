import { LayoutGrid, List, MapPin, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn, money, scoreListing } from '../lib'
import { useDemo } from '../store'
import ListingCard from '../ListingCard'
import { Badge, EmptyState, Field, Switch } from '../ui'

const cities = ['Ariana', 'Tunis', 'La Marsa', 'Ben Arous', 'Manouba', 'Sidi Bou Said', 'Gammarth']
const types = ['Apartment', 'Studio', 'Villa', 'Room', 'House']

export default function ExplorePage() {
  const listings = useDemo((s) => s.listings)
  const prefs = useDemo((s) => s.prefs)
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState('match')
  const [showFilters, setShowFilters] = useState(false)

  const [city, setCity] = useState(params.get('city') ?? '')
  const [type, setType] = useState(params.get('type') ?? '')
  const [bedrooms, setBedrooms] = useState(params.get('bedrooms') ?? '')
  const [minRent, setMinRent] = useState('')
  const [maxRent, setMaxRent] = useState(params.get('budget') ?? '')
  const [furnished, setFurnished] = useState(false)
  const [amenities, setAmenities] = useState<string[]>([])

  const reset = () => {
    setCity('')
    setType('')
    setBedrooms('')
    setMinRent('')
    setMaxRent('')
    setFurnished(false)
    setAmenities([])
    setParams({})
  }

  const results = useMemo(() => {
    const rows = listings
      .filter((l) => l.status === 'published')
      .filter((l) => (city ? l.city === city : true))
      .filter((l) => (type ? l.type === type : true))
      .filter((l) => (bedrooms ? l.bedrooms >= Number(bedrooms) : true))
      .filter((l) => (furnished ? l.furnished : true))
      .filter((l) => (minRent ? l.rent >= Number(minRent) : true))
      .filter((l) => (maxRent ? l.rent <= Number(maxRent) : true))
      .filter((l) => (amenities.length ? amenities.every((a) => l.amenities.includes(a)) : true))
      .map((l) => ({
        listing: l,
        ...scoreListing(l, {
          city: city || prefs.city,
          budgetMax: maxRent ? Number(maxRent) : prefs.budgetMax,
          layout: prefs.layout,
          furnished: furnished || prefs.furnished,
          nearMetro: prefs.nearMetro,
          quiet: prefs.quiet,
        }),
      }))

    if (sort === 'price-asc') rows.sort((a, b) => a.listing.rent - b.listing.rent)
    else if (sort === 'price-desc') rows.sort((a, b) => b.listing.rent - a.listing.rent)
    else if (sort === 'newest')
      rows.sort((a, b) => b.listing.createdAt.localeCompare(a.listing.createdAt))
    else rows.sort((a, b) => b.score - a.score)
    return rows
  }, [listings, city, type, bedrooms, furnished, minRent, maxRent, amenities, sort, prefs])

  const filterPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-medium">
          <SlidersHorizontal size={13} /> Filters
        </p>
        <button onClick={reset} className="flex items-center gap-1 text-[10.5px] text-muted hover:text-forest">
          <RotateCcw size={10} /> Reset
        </button>
      </div>

      <Field label="Location">
        <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
          <option value="">Anywhere</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <div>
        <p className="field-label">Monthly rent (DT)</p>
        <div className="flex items-center gap-2">
          <input
            value={minRent}
            onChange={(e) => setMinRent(e.target.value.replace(/\D/g, ''))}
            placeholder="Min"
            className="input"
          />
          <span className="text-muted-soft">–</span>
          <input
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value.replace(/\D/g, ''))}
            placeholder="Max"
            className="input"
          />
        </div>
      </div>

      <Field label="Property type">
        <select value={type} onChange={(e) => setType(e.target.value)} className="select">
          <option value="">Any type</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>

      <Field label="Bedrooms">
        <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="select">
          <option value="">Any number</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
      </Field>

      <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5">
        <span className="text-[11.5px]">Furnished only</span>
        <Switch checked={furnished} onChange={setFurnished} label="Furnished only" />
      </div>

      <div>
        <p className="field-label">Amenities</p>
        <div className="flex flex-wrap gap-1.5">
          {['Air conditioning', 'Elevator', 'Balcony', 'Fiber internet', 'Parking', 'Garden', 'Pool'].map(
            (a) => {
              const active = amenities.includes(a)
              return (
                <button
                  key={a}
                  onClick={() =>
                    setAmenities((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))
                  }
                  className={cn('chip', active && 'chip-active')}
                >
                  {a}
                </button>
              )
            },
          )}
        </div>
      </div>

      <div className="rounded-xl bg-sand/70 p-3">
        <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-forest">
          <Sparkles size={11} /> AI matching active
        </p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
          Every home is scored against your profile. The reasoning is on each listing.
        </p>
      </div>
    </div>
  )

  return (
    <div>
      <section className="border-b border-line bg-sand/50">
        <div className="container-page py-10">
          <p className="text-[10.5px] text-muted">
            <Link to="/" className="hover:text-forest">
              Home
            </Link>{' '}
            <span className="mx-1.5 text-muted-soft">/</span> Explore properties
          </p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="display max-w-[560px] text-[46px] leading-[1.02] sm:text-[56px]">
                Homes that fit the life you described.
              </h1>
              <p className="mt-3 max-w-[480px] text-[12.5px] leading-relaxed text-muted">
                Filter by what matters — rent, neighbourhood, daylight, distance to the metro —
                and compare compatible homes side by side.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/search/ai" className="btn btn-outline btn-sm">
                <Sparkles size={12} /> Describe it instead
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] text-muted">
                <MapPin size={11} /> {results.length} homes found
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-7 py-8 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 card p-5">{filterPanel}</div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setShowFilters((v) => !v)} className="btn btn-outline btn-sm lg:hidden">
              <SlidersHorizontal size={12} /> Filters
            </button>
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-soft">
                <Search size={13} />
              </span>
              <div className="rounded-full border border-line bg-white px-3 py-1.5 pl-8 text-[11px] text-muted">
                {results.length} homes found
                {city && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[9.5px] text-forest">
                    {city}
                    <button onClick={() => setCity('')} aria-label="Clear city">
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="select w-auto py-1.5 text-[11px]">
              <option value="match">Best match first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="newest">Newest first</option>
            </select>
            <div className="hidden items-center gap-1 rounded-lg border border-line bg-white p-0.5 sm:flex">
              <button
                onClick={() => setView('grid')}
                className={cn('grid h-7 w-7 place-items-center rounded-md', view === 'grid' ? 'bg-forest text-white' : 'text-muted')}
                aria-label="Grid view"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('grid h-7 w-7 place-items-center rounded-md', view === 'list' ? 'bg-forest text-white' : 'text-muted')}
                aria-label="List view"
              >
                <List size={13} />
              </button>
            </div>
          </div>

          {showFilters && <div className="card mb-4 p-5 lg:hidden">{filterPanel}</div>}

          {results.length === 0 ? (
            <EmptyState
              title="No homes match every filter yet"
              text="Try widening the rent range or removing an amenity. You can also describe what you want in one sentence."
              action={
                <div className="flex gap-2">
                  <button onClick={reset} className="btn btn-outline btn-sm">
                    Reset filters
                  </button>
                  <Link to="/search/ai" className="btn btn-primary btn-sm">
                    <Sparkles size={12} /> Ask Homey AI
                  </Link>
                </div>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(({ listing, score }) => (
                <ListingCard key={listing.id} listing={listing} score={score} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(({ listing, score }) => (
                <Link
                  key={listing.id}
                  to={`/properties/${listing.id}`}
                  className="card card-hover flex gap-4 overflow-hidden p-3"
                >
                  <img
                    src={listing.photos[0]}
                    alt={listing.title}
                    className="h-28 w-40 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                        {listing.type} · {listing.layout}
                      </p>
                      <Badge tone="green">
                        <Sparkles size={9} /> {score}% match
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-medium">{listing.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                      <MapPin size={10} /> {listing.neighbourhood}, {listing.city}
                    </p>
                    <p className="mt-2 text-[11px] text-muted">
                      {listing.bedrooms} bed · {listing.surface} m² · {listing.bathrooms} bath
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between py-1 pr-1">
                    <p className="font-semibold">{money(listing.rent)}</p>
                    <span className="text-[10px] text-muted-soft">per month</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
