import {
  ArrowRight,
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  MessageSquare,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { analyzeListing, cn, dateLabel, money, scoreListing } from '../lib'
import { useCurrentUser, useDemo } from '../store'
import ListingCard from '../ListingCard'
import { Avatar, Badge, EmptyState, Field, MatchRing, Modal, showToast } from '../ui'

export default function ListingDetailPage() {
  const { id } = useParams()
  const listings = useDemo((s) => s.listings)
  const users = useDemo((s) => s.users)
  const prefs = useDemo((s) => s.prefs)
  const favorites = useDemo((s) => s.favorites)
  const toggleFavorite = useDemo((s) => s.toggleFavorite)
  const startConversation = useDemo((s) => s.startConversation)
  const requestVisit = useDemo((s) => s.requestVisit)
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(0)
  const [contact, setContact] = useState(false)
  const [message, setMessage] = useState('Hello, I would like to visit the apartment this week if possible.')
  const [moveIn, setMoveIn] = useState('')
  const [askOpen, setAskOpen] = useState(false)

  const listing = listings.find((l) => l.id === id)
  if (!listing) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="This home is no longer available"
          text="It may have been rented or removed. Explore the current listings instead."
          action={
            <Link to="/properties" className="btn btn-primary">
              Browse homes
            </Link>
          }
        />
      </div>
    )
  }

  const owner = users.find((u) => u.id === listing.ownerId)
  const saved = favorites.includes(listing.id)
  const { score, reasons } = scoreListing(listing, prefs)
  const quality = analyzeListing(listing)
  const similar = listings
    .filter((l) => l.status === 'published' && l.id !== listing.id && l.city === listing.city)
    .slice(0, 3)
  const ownerListings = listings.filter((l) => l.ownerId === listing.ownerId).length

  const send = () => {
    if (!user) {
      navigate(`/login?next=/properties/${listing.id}`)
      return
    }
    if (!moveIn) {
      showToast('Choose a move-in date first.')
      return
    }
    const conversationId = startConversation(listing.ownerId, listing.id, message)
    requestVisit({ listingId: listing.id, message, moveIn })
    setContact(false)
    showToast('Request sent. The owner usually replies within an hour.')
    navigate(`/messages/${conversationId}`)
  }

  return (
    <div className="container-page py-7">
      <p className="text-[10.5px] text-muted">
        <Link to="/" className="hover:text-forest">
          Home
        </Link>{' '}
        <span className="mx-1.5 text-muted-soft">/</span>{' '}
        <Link to="/properties" className="hover:text-forest">
          Explore properties
        </Link>{' '}
        <span className="mx-1.5 text-muted-soft">/</span> {listing.neighbourhood}
      </p>

      {/* Gallery */}
      <div className="mt-3 grid gap-2 overflow-hidden rounded-2xl md:grid-cols-[1.7fr_1fr]">
        <div className="relative h-[280px] sm:h-[380px] md:h-[420px]">
          <img
            src={listing.photos[photo]}
            alt={listing.title}
            className="h-full w-full rounded-2xl object-cover"
          />
          <div className="absolute top-3 left-3 flex gap-1.5">
            {listing.verified && <Badge tone="outline">Verified</Badge>}
            {listing.furnished && <Badge tone="outline">Furnished</Badge>}
            <Badge tone="outline">Immo · {listing.reference}</Badge>
          </div>
          <button
            onClick={() => {
              toggleFavorite(listing.id)
              showToast(saved ? 'Removed from saved homes.' : 'Saved to your homes.')
            }}
            className={cn(
              'absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow',
              saved ? 'text-clay' : 'text-muted',
            )}
            aria-label="Save home"
          >
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {listing.photos.slice(1, 3).map((src, index) => (
            <button
              key={src}
              onClick={() => setPhoto(index + 1)}
              className="relative h-[135px] overflow-hidden rounded-2xl md:h-[206px]"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              {index === 1 && listing.photos.length > 3 && (
                <span className="absolute inset-0 grid place-items-center bg-[#16241d]/40 text-xs font-medium text-white">
                  +{listing.photos.length - 3} photos
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="display text-[40px] leading-[1.05] sm:text-[48px]">{listing.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
            <MapPin size={12} /> {listing.neighbourhood}, {listing.city} · {listing.type} ·{' '}
            {listing.layout} · {listing.surface} m²
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-[11.5px] text-muted">
            <span className="flex items-center gap-1 text-clay">
              <Star size={12} fill="currentColor" /> {listing.rating.toFixed(1)} · 24 reviews
            </span>
            <span className="flex items-center gap-1">
              <BedDouble size={13} /> {listing.bedrooms} bedroom{listing.bedrooms > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Bath size={13} /> {listing.bathrooms} bathroom{listing.bathrooms > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Ruler size={13} /> {listing.surface} m²
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={13} /> Available {dateLabel(listing.availableFrom)}
            </span>
          </div>

          <div className="mt-8 border-t border-line pt-7">
            <h2 className="display text-[28px]">About this home</h2>
            {listing.description.split('\n\n').map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="mt-3 max-w-[680px] text-[12.5px] leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-8 border-t border-line pt-7">
            <h2 className="display text-[26px]">What’s included</h2>
            <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {listing.amenities.map((a) => (
                <span key={a} className="flex items-center gap-2 text-[11.5px] text-muted">
                  <Check size={13} className="text-forest" /> {a}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-[#f7f4ec] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative">
                <MatchRing score={score} size={84} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold tracking-[0.16em] text-clay uppercase">
                  Personalised
                </p>
                <h2 className="font-display text-[26px] leading-tight">Why this home matches your preferences</h2>
                <p className="mt-1 text-[11px] text-muted">
                  Based on your budget, preferred areas and the way you said you like to live.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(reasons.length ? reasons : ['A well-kept home in a city you are considering', 'Verified owner identity']).map(
                (r) => (
                  <span key={r} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-muted">
                    <Check size={12} className="mt-0.5 shrink-0 text-forest" /> {r}
                  </span>
                ),
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-muted-soft">
                Matches are explained, never scored in secret. Final decision is yours.
              </p>
              <Link to="/profile?tab=preferences" className="text-[10.5px] font-medium text-forest hover:underline">
                Adjust my preferences →
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <ShieldCheck size={16} className="text-forest" />
                <span>
                  <span className="font-medium text-ink">Quality checked.</span> Score {quality.score}/100 ·
                  owner identity verified
                </span>
              </div>
              <Badge tone="green">
                <Sparkles size={9} /> AI review passed
              </Badge>
            </div>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {quality.checks.slice(0, 4).map((c) => (
                <span key={c.label} className="flex items-center gap-1.5 text-[10.5px] text-muted">
                  <Check size={11} className={c.ok ? 'text-forest' : 'text-clay'} /> {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky owner card */}
        <aside>
          <div className="lg:sticky lg:top-24 space-y-3">
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-[36px] leading-none">{money(listing.rent)}</p>
                  <p className="text-[9.5px] tracking-[0.1em] text-muted uppercase">per month</p>
                </div>
                <Badge tone="green">
                  <Sparkles size={10} /> {score}% match
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#faf8f1] p-3">
                <Avatar src={owner?.avatar} name={owner?.name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[12px] font-medium">
                    {owner?.name} {owner?.verified && <ShieldCheck size={11} className="text-forest" />}
                  </p>
                  <p className="text-[10px] text-muted">Responds under 1 hour</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px] text-muted">
                <span>Member since {owner?.since}</span>
                <span className="text-right">Response rate 98%</span>
                <span>{ownerListings} listings</span>
                <span className="text-right">Deposit {money(listing.deposit)}</span>
              </div>

              <button onClick={() => setContact(true)} className="btn btn-primary mt-4 w-full">
                <MessageSquare size={13} /> Contact owner
              </button>
              <button
                onClick={() => setAskOpen(true)}
                className="btn btn-outline mt-2 w-full"
              >
                <Sparkles size={13} /> Ask Homey AI
              </button>
              <p className="mt-3 text-center text-[9.5px] leading-relaxed text-muted-soft">
                Never send a deposit before viewing a home and confirming the owner’s identity.
              </p>
            </div>

            <div className="card p-5">
              <p className="text-[9.5px] font-semibold tracking-[0.14em] text-muted uppercase">Quick facts</p>
              <dl className="mt-2.5 space-y-2 text-[11px]">
                {[
                  ['Available from', dateLabel(listing.availableFrom)],
                  ['Listed on', dateLabel(listing.createdAt)],
                  ['Reference', listing.reference],
                  ['Deposit', money(listing.deposit)],
                  ['Furnished', listing.furnished ? 'Yes' : 'No'],
                  ['Metro', listing.nearMetro ? '4 min walk' : 'Bus / car'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-forest">
                <ShieldCheck size={12} /> Homey verification
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                The owner’s identity and the address were checked by a person, not only a model.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14 border-t border-line pt-9">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Keep looking</p>
              <h2 className="display mt-2 text-[32px]">Similar homes in {listing.city}</h2>
            </div>
            <Link to="/properties" className="btn btn-outline btn-sm">
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} score={scoreListing(l, prefs).score} />
            ))}
          </div>
        </section>
      )}

      <Modal open={contact} onClose={() => setContact(false)} title="Request a visit">
        <div className="flex items-center gap-3 rounded-xl bg-sand/70 p-3">
          <img src={listing.photos[0]} alt="" className="h-12 w-14 rounded-lg object-cover" />
          <div>
            <p className="text-[12px] font-medium">{listing.title}</p>
            <p className="text-[10.5px] text-muted">
              {money(listing.rent)} / month · {listing.neighbourhood}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Your message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="textarea"
            />
          </Field>
          <Field label="Preferred move-in date" className="mt-3">
            <input
              type="date"
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              className="input"
            />
          </Field>
          <p className="mt-3 text-[10px] text-muted-soft">
            Demo only. The message is stored in this browser and never reaches a real owner.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setContact(false)} className="btn btn-outline">
              Cancel
            </button>
            <button onClick={send} className="btn btn-primary">
              Send request <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={askOpen} onClose={() => setAskOpen(false)} title="Ask Homey AI">
        <p className="text-[12px] text-muted">
          Ask anything about this home. The assistant answers from the listing details and your
          preferences — it will not invent a parking space or an amenity.
        </p>
        <div className="mt-4 space-y-2">
          {[
            `Is ${money(listing.rent)} reasonable for ${listing.surface} m² in ${listing.city}?`,
            'What is included in the rent?',
            'How far is the metro, and is the street quiet?',
            `Would this fit a ${prefs.layout} budget of ${money(prefs.budgetMax)}?`,
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                setAskOpen(false)
                navigate(`/search/ai?q=${encodeURIComponent(q)}`)
              }}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-left text-[11.5px] hover:bg-cream"
            >
              {q} <ArrowRight size={11} className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-muted-soft">
          Demo answers only · no model is called.
        </p>
      </Modal>
    </div>
  )
}
