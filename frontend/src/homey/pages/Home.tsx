import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { defaultPrefs, money, scoreListing, searchListings } from '../lib'
import { useDemo } from '../store'
import ListingCard from '../ListingCard'
import { Avatar, Badge } from '../ui'

export default function HomePage() {
  const listings = useDemo((s) => s.listings)
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [type, setType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const navigate = useNavigate()

  const published = listings.filter((l) => l.status === 'published')
  const featured = published
    .map((l) => ({ listing: l, ...scoreListing(l, defaultPrefs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  const showcase = searchListings(published, {
    city: 'Ariana',
    budgetMax: 700,
    layout: 'S+1',
    furnished: true,
    nearMetro: true,
    quiet: true,
    keywords: [],
  }).slice(0, 3)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location) params.set('city', location)
    if (budget) params.set('budget', budget)
    if (type) params.set('type', type)
    if (bedrooms) params.set('bedrooms', bedrooms)
    navigate(`/properties?${params.toString()}`)
  }

  return (
    <div>
      {/* HERO */}
      <section className="container-page grid gap-10 pt-10 pb-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-14">
        <div className="flex flex-col justify-center">
          <p className="flex items-center gap-2 text-[10.5px] font-medium tracking-[0.18em] text-clay uppercase">
            <span className="h-1 w-1 rounded-full bg-clay" /> Renting, thoughtfully — Tunisia
          </p>
          <h1 className="display mt-4 text-[56px] text-ink sm:text-[68px] lg:text-[74px]">
            Find a place that
            <br />
            feels like <span className="italic text-forest">home.</span>
          </h1>
          <p className="mt-5 max-w-[430px] text-[13.5px] leading-relaxed text-muted">
            Discover the right home or roommate with a smarter and simpler rental
            experience. Verified listings, honest detail and a little less guesswork.
          </p>

          <form
            onSubmit={submit}
            className="mt-7 rounded-2xl border border-line bg-white p-3 shadow-[0_20px_50px_-38px_rgba(31,75,58,0.45)]"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="rounded-xl border border-line-soft px-3 py-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold tracking-[0.13em] text-muted uppercase">
                  <MapPin size={9} /> Location
                </span>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent text-[12.5px] outline-none"
                >
                  <option value="">Anywhere</option>
                  {['Ariana', 'Tunis', 'La Marsa', 'Ben Arous', 'Manouba', 'Sidi Bou Said', 'Gammarth'].map(
                    (city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="rounded-xl border border-line-soft px-3 py-2">
                <span className="text-[9px] font-semibold tracking-[0.13em] text-muted uppercase">
                  Budget
                </span>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent text-[12.5px] outline-none"
                >
                  <option value="">Any budget</option>
                  <option value="500">300 – 500 DT</option>
                  <option value="700">500 – 700 DT</option>
                  <option value="1000">700 – 1 000 DT</option>
                  <option value="1500">1 000 – 1 500 DT</option>
                  <option value="4000">1 500 DT +</option>
                </select>
              </label>
              <label className="rounded-xl border border-line-soft px-3 py-2">
                <span className="text-[9px] font-semibold tracking-[0.13em] text-muted uppercase">
                  Property type
                </span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent text-[12.5px] outline-none"
                >
                  <option value="">Any type</option>
                  {['Apartment', 'Studio', 'Villa', 'Room', 'House'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-xl border border-line-soft px-3 py-2">
                <span className="text-[9px] font-semibold tracking-[0.13em] text-muted uppercase">
                  Bedrooms
                </span>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent text-[12.5px] outline-none"
                >
                  <option value="">Any number</option>
                  <option value="1">1 bedroom</option>
                  <option value="2">2 bedrooms</option>
                  <option value="3">3+ bedrooms</option>
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn-primary mt-2.5 w-full">
              <Search size={14} /> Search properties
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2.5 pb-1 text-[10.5px] text-muted">
              <span>Not sure what to look for? Describe it instead.</span>
              <Link to="/search/ai" className="inline-flex items-center gap-1 font-medium text-forest">
                <Sparkles size={11} /> Search with AI <ArrowRight size={11} />
              </Link>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {['amira', 'sarah', 'nour'].map((id) => (
                  <Avatar key={id} src={`/photos/avatar-${id}.jpg`} size={26} className="ring-2 ring-cream" />
                ))}
              </div>
              <p className="text-[10.5px] leading-tight text-muted">
                <span className="font-semibold text-ink">1 248 people</span>
                <br />
                renting with Homey
              </p>
            </div>
            <div>
              <p className="text-[10.5px] leading-tight text-muted">
                <span className="font-semibold text-ink">842 verified homes</span>
                <br />
                across 9 cities
              </p>
            </div>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative">
          <div className="relative h-[320px] overflow-hidden rounded-[26px] sm:h-[420px] lg:h-full lg:min-h-[540px]">
            <img src="/photos/house-2.jpg" alt="A modern home" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#13241c]/25 via-transparent to-transparent" />
            <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium text-ink backdrop-blur">
              <ShieldCheck size={11} /> Owner verified
            </span>
            <div className="absolute top-[38%] right-3 max-w-[170px] rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-forest" /> Metro · 4 min
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                Also 6 min to the market and two bakeries.
              </p>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur sm:right-auto sm:max-w-[290px]">
              <img src="/photos/living-2.jpg" alt="" className="h-11 w-11 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[9px] font-medium text-forest">
                  <Sparkles size={9} /> 94% match
                  <span className="ml-1 rounded-full bg-sand px-1.5 py-0.5 text-[8px] font-normal text-muted">
                    for your profile
                  </span>
                </p>
                <p className="mt-1 truncate text-[11.5px] font-medium">Sunlit S+1 near Ariana Centre</p>
                <p className="text-[10px] text-muted">Ariana · 680 DT / month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section className="container-page pb-16">
        <div className="rounded-[26px] border border-line bg-[#f7f4ec] p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-end">
            <div>
              <p className="eyebrow">Why Homey</p>
              <h2 className="display mt-2 text-[38px] leading-[1.02] sm:text-[46px]">
                Better for the people looking,
                <br />
                and the people renting.
              </h2>
            </div>
            <p className="max-w-[440px] justify-self-end text-[13px] leading-relaxed text-muted">
              Most rental sites are a wall of listings. Homey starts from how you actually
              want to live, then shows only the homes that fit — with the reasoning attached.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-forest">
                  <Search size={15} />
                </span>
                <Badge tone="green">For tenants</Badge>
              </div>
              <h3 className="mt-5 font-display text-[25px]">A search that respects your time</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                Stop scrolling through listings that were never going to work. Tell Homey
                what you need once, and keep refining from there.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'Compatibility scores with visible reasoning',
                  'Save homes and compare them side by side',
                  'Message owners without exchanging phone numbers',
                  'Roommate matching before you commit to a lease',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11.5px] text-muted">
                    <Check size={13} className="mt-0.5 shrink-0 text-forest" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/properties" className="btn btn-outline btn-sm mt-5">
                Find a home <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="rounded-2xl border border-[#e3d7cd] bg-[#fbf3ee] p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-clay">
                  <CalendarCheck size={15} />
                </span>
                <Badge tone="clay">For owners</Badge>
              </div>
              <h3 className="mt-5 font-display text-[25px]">Present your home the way it deserves</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                A guided listing flow, an AI description you can edit, and a quality review
                that tells you what to improve rather than leaving you guessing.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'A guided listing form that produces better ads',
                  'AI descriptions you can edit and keep',
                  'Quality suggestions before an admin review',
                  'Clear statistics on views and interested tenants',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11.5px] text-muted">
                    <Check size={13} className="mt-0.5 shrink-0 text-clay" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/owner/listings/new" className="btn btn-primary btn-sm mt-5">
                List a property <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page pb-16">
        <div className="rounded-[26px] bg-[#f4f1e8] px-6 py-10 sm:px-10">
          <p className="eyebrow">How Homey works</p>
          <h2 className="display mt-2 text-[38px] sm:text-[44px]">Three steps, no pressure</h2>
          <p className="mt-2 max-w-[520px] text-[13px] text-muted">
            Homey is built around the way people actually decide: slowly, with questions, and
            with a strong feeling about the light in a room.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              {
                n: '01',
                icon: Search,
                title: 'Tell us how you want to live',
                text: 'Your budget, your neighbourhood, the light you like in the morning. Describe it in a sentence or set precise filters.',
              },
              {
                n: '02',
                icon: Heart,
                title: 'See homes that actually fit',
                text: 'Every listing is scored against your preferences, with the reasoning shown so you can decide what matters.',
              },
              {
                n: '03',
                icon: CalendarCheck,
                title: 'Move in with confidence',
                text: 'Talk to verified owners, check the details that matter and agree a visit without the usual back and forth.',
              },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-line bg-white p-6">
                <div className="flex items-start justify-between">
                  <span className="font-display text-[26px] italic text-clay">{step.n}</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-forest">
                    <step.icon size={15} />
                  </span>
                </div>
                <h3 className="mt-6 font-display text-[23px] leading-tight">{step.title}</h3>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted">
              Prefer to read the detail first? The full process is documented.
            </p>
            <Link to="/how-it-works" className="btn btn-outline btn-sm">
              How it works, in full <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* AI SHOWCASE */}
      <section className="container-page pb-16">
        <div className="grid overflow-hidden rounded-[26px] border border-line bg-white lg:grid-cols-2">
          <div className="p-7 sm:p-11">
            <p className="eyebrow">In context</p>
            <blockquote className="display mt-3 text-[34px] leading-[1.05] sm:text-[40px]">
              “S+1 in Ariana, 700 DT maximum, near the metro, quiet, furnished.”
            </blockquote>
            <p className="mt-4 max-w-[400px] text-[12.5px] leading-relaxed text-muted">
              What looks like one sentence becomes six criteria, a ranking of 12 homes and a
              short explanation of why the first three came out on top. You can change any of
              it in a follow-up line.
            </p>
            <Link to="/search/ai" className="btn btn-outline mt-6">
              Try this search <ArrowRight size={13} />
            </Link>
          </div>
          <div className="bg-[#f7f4ec] p-5 sm:p-8">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                Interpreted criteria
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {['Ariana', 'Up to 700 DT', 'S+1', 'Near transport', 'Quiet area', 'Furnished'].map(
                  (chip) => (
                    <span key={chip} className="chip">
                      {chip}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-5 space-y-2">
                {showcase.map(({ listing, score }) => (
                  <Link
                    key={listing.id}
                    to={`/properties/${listing.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-soft px-3 py-2.5 hover:bg-cream"
                  >
                    <span className="truncate text-[11.5px]">{listing.title}</span>
                    <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-[9.5px] text-white">
                      {score}%
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-muted-soft">
                Scores shown are illustrative demo values, not a promise of suitability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="container-page pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Selected for you</p>
            <h2 className="display mt-2 text-[38px] sm:text-[44px]">Homes that seem to suit you</h2>
          </div>
          <Link to="/properties" className="btn btn-outline btn-sm">
            Explore all properties <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(({ listing, score }) => (
            <ListingCard key={listing.id} listing={listing} score={score} />
          ))}
        </div>
      </section>

      {/* QUOTE */}
      <section className="container-page pb-16 text-center">
        <span className="font-display text-[44px] leading-none text-clay">”</span>
        <blockquote className="display mx-auto mt-2 max-w-[680px] text-[30px] leading-[1.15] sm:text-[36px]">
          “I stopped opening fifteen tabs. I described the flat I wanted, and the second one
          Homey showed me is the one I rent today.”
        </blockquote>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <Avatar src="/photos/avatar-amira.jpg" size={34} />
          <div className="text-left">
            <p className="text-[11.5px] font-medium">Amira Khelifi</p>
            <p className="text-[10px] text-muted">Tenant · Ariana</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-8">
        <div className="overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-[#f7f2e7] via-[#fbf7ee] to-[#f4ece2] px-6 py-14 text-center sm:px-10">
          <p className="eyebrow">Start here</p>
          <h2 className="display mx-auto mt-3 max-w-[560px] text-[42px] leading-[1.03] sm:text-[52px]">
            Your next home is closer than it feels.
          </h2>
          <p className="mx-auto mt-3 max-w-[440px] text-[12.5px] text-muted">
            Browse the current listings, or create a profile and let Homey do the first pass
            for you. No fees to look.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link to="/properties" className="btn btn-primary">
              Start exploring <ArrowRight size={13} />
            </Link>
            <Link to="/roommates" className="btn btn-outline">
              Find a roommate
            </Link>
          </div>
          <p className="mt-5 text-[10px] text-muted-soft">
            Demo environment · listings and accounts are stored in this browser
          </p>
          <div className="mt-2 text-[10px] text-muted-soft">
            From {money(380)} per month · 9 cities across Tunisia
          </div>
        </div>
      </section>
    </div>
  )
}
